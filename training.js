/* КБЖВ 8321 v148 — тренування, JSON/ZIP, PDF і окрема Worker v95 sync.
   Зберігає попередні ключі IndexedDB, не змішує з КБЖВ snapshot/backup. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const loadButton = $('training-load');
  const clearButton = $('training-clear');
  const fileInput = $('training-file');
  const statusNode = $('training-status');
  const content = $('training-content');
  const pdfAddButton = $('training-pdf-add');
  const uploadPdf1Button = $('training-upload-pdf-1');
  const uploadPdf2Button = $('training-upload-pdf-2');
  const exportPdf1Button = $('training-export-pdf-1');
  const exportPdf2Button = $('training-export-pdf-2');
  const pdfInput = $('training-pdf-file');
  const pdfReplaceInput = $('training-pdf-replace-file');
  const pdfContent = $('training-pdf-list');
  const pdfStatus = $('training-pdf-status');
  const extractButton = $('training-extract');
  const packageExportButton = $('training-export-package');
  const packageImportButton = $('training-import-package');
  const packageInput = $('training-package-file');
  const packageStatus = $('training-package-status');
  const conflictActions = $('training-conflict-actions');
  const useLocalButton = $('training-use-local');
  const useCloudButton = $('training-use-cloud');
  if (![loadButton, clearButton, fileInput, statusNode, content, pdfAddButton,
        pdfInput, pdfReplaceInput, pdfContent, pdfStatus, extractButton,
        packageExportButton, packageImportButton, packageInput, packageStatus,
        conflictActions, useLocalButton, useCloudButton, uploadPdf1Button, uploadPdf2Button, exportPdf1Button, exportPdf2Button].every(Boolean)) return;

  const DB_NAME = 'kbjv8321_training_local_v1'; // ПОВИНЕН залишатися незмінним
  const PLAN_STORE = 'plans'; // Поточні плани v145 НЕ мігрувати/видаляти
  const PDF_STORE = 'pdf_documents';
  const META_STORE = 'sync_meta';
  const AUTH_URL = 'https://kbjv-auth-api-dev.anthonybatyk.workers.dev';
  const TRAINING_CHUNK_SIZE = 96 * 1024;
  const MAX_PLAN_SIZE = 1024 * 1024;
  const MAX_PDF_SIZE = 30 * 1024 * 1024;
  const feedbackTimers = new WeakMap();
  const objectUrls = new Set();
  let dbPromise;
  let userId = '';
  let plan = null;
  let documents = [null, null];
  let corrupt = false;
  let loaded = false;
  let planBusy = false;
  let pdfBusy = false;
  let epoch = 0;
  let writeQueue = Promise.resolve();
  let pdfReplaceSlot = null;
  let pdfUploadSource = null;
  let syncMeta = null;
  let syncActive = false;
  let lastRemoteState = null;
  let syncTimer = null;
  let dayEditing = false;
  let conflictDetected = false;
  let lastSyncError = '';
  const defaultMeta = () => ({planRevision:null,pdfRevisions:[null,null],dirtyPlan:false,dirtyPdfs:[false,false]});
  const archiveVersion = () => plan ? (Number(plan.archiveVersion)||1) : 0;
  const archiveDate = () => plan?.archiveUpdatedAt || plan?.archiveCreatedAt || '';
  const archiveStats = () => ({version:archiveVersion(),updatedAt:archiveDate(),loaded,
    sync:!navigator.onLine?'Офлайн':conflictDetected?'Конфлікт':lastSyncError?'Помилка синхронізації':!loaded?'Очікування':
    (syncMeta?.dirtyPlan || syncMeta?.dirtyPdfs?.some(Boolean))?'Очікує синхронізації':'Синхронізовано',
    planBytes:plan?new TextEncoder().encode(JSON.stringify(plan)).byteLength:0,
    pdfBytes:documents.reduce((sum,d)=>sum+(d?.blob?.size||d?.size||0),0)});
  window.kbjvTrainingInfo={snapshot:archiveStats};
  function notifyStats(){
    const label=content.querySelector('.training-plan-version');
    if(label&&plan)label.textContent=`Версія архіву: v${archiveVersion()}`;
    window.dispatchEvent(new Event('training:stats'));
  }
  function setVersion(target,minimum=0){
    if(!target)return;
    const oldVersion=archiveVersion();
    const declared=Number(target.archiveVersion)||0;
    const next=Math.max(1, minimum, oldVersion+1, declared);
    const now=new Date().toISOString();
    target.archiveVersion=next;
    target.archiveCreatedAt=target.archiveCreatedAt||plan?.archiveCreatedAt||now;
    target.archiveUpdatedAt=now;
  }
  function contentOnly(input){
    if(!input)return null;
    const copy=JSON.parse(JSON.stringify(normalize(input)));
    delete copy.archiveVersion;delete copy.archiveCreatedAt;delete copy.archiveUpdatedAt;
    return copy;
  }
  async function identicalDocuments(a,b){
    if(!a&&!b)return true;
    if(!a||!b||a.size!==b.size||!(a.blob instanceof Blob)||!(b.blob instanceof Blob))return false;
    // Compare byte-for-byte without requiring WebCrypto / a huge 30-MB array.
    // This works in an installed offline PWA as well as Safari and Chromium.
    const chunkSize=256*1024;
    for(let start=0;start<a.size;start+=chunkSize){
      const [left,right]=await Promise.all([
        a.blob.slice(start,start+chunkSize).arrayBuffer(),
        b.blob.slice(start,start+chunkSize).arrayBuffer()
      ]);
      const aa=new Uint8Array(left),bb=new Uint8Array(right);
      if(aa.length!==bb.length)return false;
      for(let i=0;i<aa.length;i++)if(aa[i]!==bb[i])return false;
    }
    return true;
  }
  function status(node, message, tone = '') {
    node.textContent = message;
    if (tone) node.dataset.tone = tone;
    else delete node.dataset.tone;
  }
  // The core site owns every button status and its ONE ✓/✕ pseudo-element.
  // Never append a second symbol into button.textContent here.
  function feedback(button, label, tone = 'success') {
    if (!button) return;
    const shared = window.kbjvButtonFeedback;
    if (shared?.show) {
      shared.show(button, label, tone, 1450);
      return;
    }
    // Defensive fallback if the main script has not finished initialization.
    const original=button.dataset.originalText||button.textContent;
    button.dataset.originalText=original;
    clearTimeout(feedbackTimers.get(button));
    button.classList.remove('button-status-success','button-status-error','button-status-info');
    button.textContent=label;
    button.classList.add(`button-status-${tone}`);
    feedbackTimers.set(button,setTimeout(()=>{
      button.classList.remove('button-status-success','button-status-error','button-status-info');
      button.textContent=button.dataset.originalText||original;
    },1450));
  }
  function commentEditState(button, editing) {
    if (!button) return;
    const shared=window.kbjvButtonFeedback;
    if(shared?.clear)shared.clear(button);
    else{
      clearTimeout(feedbackTimers.get(button));
      button.classList.remove('button-status-success','button-status-error','button-status-info');
    }
    const label=editing?'Зберегти дані':'Редагувати';
    button.dataset.originalText=label;
    button.textContent=label;
    button.setAttribute('aria-pressed',String(editing));
    if(editing){
      if(shared?.show)shared.show(button,label,'info',0);
      else button.classList.add('button-status-info');
    }
  }
  function setBusy(which, value) {
    if (which === 'plan') planBusy = value;
    else pdfBusy = value;
    loadButton.disabled = planBusy || !loaded;
    clearButton.disabled = planBusy || !loaded;
    fileInput.disabled = planBusy || !loaded;
    pdfAddButton.disabled = pdfBusy || !loaded;
    pdfInput.disabled = pdfBusy || !loaded;
    pdfReplaceInput.disabled = pdfBusy || !loaded;
    pdfContent.querySelectorAll('button').forEach(button => { button.disabled = pdfBusy || !loaded; });
    extractButton.disabled = planBusy || !loaded;
    packageExportButton.disabled = planBusy || pdfBusy || !loaded;
    packageImportButton.disabled = planBusy || pdfBusy || !loaded;
    packageInput.disabled = planBusy || pdfBusy || !loaded;
    [uploadPdf1Button,uploadPdf2Button,exportPdf1Button,exportPdf2Button].forEach(button=>{button.disabled=planBusy||pdfBusy||!loaded;});
  }
  function log(type) {
    window.dispatchEvent(new CustomEvent('training:action', {detail: {type, archiveVersion:archiveVersion()}}));
  }
  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) { reject(new Error('IndexedDB недоступна.')); return; }
      const request = indexedDB.open(DB_NAME, 3);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(PLAN_STORE)) db.createObjectStore(PLAN_STORE);
        if (!db.objectStoreNames.contains(PDF_STORE)) db.createObjectStore(PDF_STORE);
        if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE);
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => db.close();
        resolve(db);
      };
      request.onerror = () => reject(request.error || new Error('Помилка відкриття IndexedDB.'));
      request.onblocked = () => reject(new Error('Закрийте інші відкриті вкладки сайту й оновіть сторінку.'));
    });
    return dbPromise;
  }
  async function dbRead(store, key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error || new Error('Не вдалося прочитати локальні дані.'));
      tx.onabort = () => reject(tx.error || new Error('Читання локальних даних перервано.'));
    });
  }
  async function dbMutation(store, action, key, value) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      const objectStore = tx.objectStore(store);
      if (action === 'put') objectStore.put(value, key);
      else objectStore.delete(key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error('Не вдалося записати локальні дані.'));
      tx.onabort = () => reject(tx.error || new Error('Збереження локальних даних перервано.'));
    });
  }
  const pdfKey = (id, slot) => `${id}:pdf:${slot}`;
  function val(value, max, field, required = false) {
    if (value === undefined || value === null) {
      if (!required) return '';
      throw new Error(`Не вказано «${field}».`);
    }
    if (typeof value !== 'number' && typeof value !== 'string') throw new Error(`Поле «${field}» має бути текстом або числом.`);
    const result = String(value).trim();
    if ((required && !result) || result.length > max) throw new Error(`Некоректне поле «${field}» (максимум ${max} символів).`);
    return result;
  }
  function normalize(input, preserveLegacy = false) {
    if (!input || Array.isArray(input) || typeof input !== 'object' || input.format !== 'kbjv-training-plan' || input.version !== 1) {
      throw new Error('Непідтримуваний JSON. Очікується format: "kbjv-training-plan" та version: 1.');
    }
    const title = val(input.title, 140, 'title', true);
    const period = val(input.period, 140, 'period');
    if (!Array.isArray(input.days) || input.days.length < 1 || input.days.length > 31) throw new Error('Потрібен масив days з 1–31 дня.');
    let total = 0;
    const days = input.days.map((entry, index) => {
      if (!entry || Array.isArray(entry) || typeof entry !== 'object') throw new Error(`День ${index + 1}: некоректний об’єкт.`);
      const day = val(entry.day ?? index + 1, 30, 'day', true);
      const dayTitle = val(entry.title ?? `День ${day}`, 130, 'title дня', true);
      const comment = val(entry.comment, 1500, 'comment дня');
      if (!Array.isArray(entry.exercises) || !entry.exercises.length || entry.exercises.length > 80) throw new Error(`День ${day}: потрібно 1–80 вправ.`);
      total += entry.exercises.length;
      if (total > 500) throw new Error('План містить понад 500 вправ.');
      const exercises = entry.exercises.map((item, pos) => {
        if (!item || Array.isArray(item) || typeof item !== 'object') throw new Error(`День ${day}, вправа ${pos + 1}: некоректний об’єкт.`);
        const name = val(item.name, 160, 'name вправи', true);
        if (!Number.isInteger(item.sets) || item.sets < 1 || item.sets > 30) throw new Error(`«${name}»: sets — ціле від 1 до 30.`);
        const result = {name, sets:item.sets, reps:val(item.reps,45,`reps для «${name}»`,true),
          weight:val(item.weight,60,'weight'), note:val(item.note,500,'note')};
        // Старі позначки й коментарі v145 залишаються у сховищі прихованими,
        // щоб сама зміна інтерфейсу не знищила раніше збережених значень.
        if (preserveLegacy) {
          if (item.done === true) result.done = true;
          if (item.comment) result.comment = val(item.comment,1000,'старий коментар вправи');
        }
        return result;
      });
      return {day, title:dayTitle, comment, exercises};
    });
    const archiveVersionNumber=input.archiveVersion===undefined?1:Number(input.archiveVersion);
    if(!Number.isSafeInteger(archiveVersionNumber)||archiveVersionNumber<1||archiveVersionNumber>2147483647)
      throw new Error('Некоректна версія тренувального архіву.');
    const archiveCreatedAt=val(input.archiveCreatedAt,40,'archiveCreatedAt');
    const archiveUpdatedAt=val(input.archiveUpdatedAt,40,'archiveUpdatedAt');
    return {format:'kbjv-training-plan',version:1,title,period,days,
      archiveVersion:archiveVersionNumber,archiveCreatedAt,archiveUpdatedAt};
  }
  function el(tag, cls, txt) {
    const item = document.createElement(tag);
    if (cls) item.className = cls;
    if (txt !== undefined) item.textContent = txt;
    return item;
  }
  async function savePlan(type = '') {
    if (!userId || !plan) return false;
    const id = userId;
    const currentEpoch = epoch;
    const snapshot = JSON.parse(JSON.stringify(plan));
    status(statusNode, 'Збереження коментаря...');
    const job = writeQueue.catch(() => {}).then(() => dbMutation(PLAN_STORE, 'put', id, {plan:snapshot,savedAt:new Date().toISOString()}));
    writeQueue = job;
    try {
      await job;
      if (id === userId && currentEpoch === epoch) {
        if (writeQueue === job) status(statusNode, 'Коментар збережено на цьому пристрої.', 'success');
        if (type) log(type);
      }
      return true;
    } catch (error) {
      if (currentEpoch === epoch) status(statusNode, `Помилка збереження: ${error.message}. Не закривайте сторінку.`, 'error');
      return false;
    }
  }
  function renderPlan() {
    content.replaceChildren();
    notifyStats();
    if (!loaded) return;
    if (corrupt) {
      content.append(el('div','training-empty','Поточний план пошкоджений. Його можна замінити JSON або ZIP.'));
      return;
    }
    if (!plan) {
      content.append(el('div','training-empty','План ще не завантажено. Виберіть JSON або ZIP з програмою.'));
      return;
    }
    const overview=el('section','training-plan-overview');
    overview.append(el('h2','',plan.title));
    if (plan.period) overview.append(el('p','training-plan-meta',`Період: ${plan.period}`));
    overview.append(el('p','training-plan-meta training-plan-version',`Версія архіву: v${archiveVersion()}`));
    content.append(overview);
    plan.days.forEach((day,index)=>{
      const section=el('section','tracker training-day');
      section.append(el('h2','training-day-title',day.title));
      const list=el('div','training-exercises');
      day.exercises.forEach(exercise=>{
        const row=el('article','training-exercise');
        row.append(el('div','training-exercise-title',exercise.note ? `${exercise.name} — ${exercise.note}` : exercise.name));
        const details=el('div','training-exercise-details');
        details.append(el('span','',`Підходи: ${exercise.sets}`));
        details.append(el('span','',`Повторення: ${exercise.reps}`));
        if(exercise.weight) details.append(el('span','',`Вага: ${exercise.weight}`));
        row.append(details);
        list.append(row);
      });
      section.append(list);
      const comments=el('div','training-comment-section');
      comments.append(el('div','training-comment-heading','Коментар до дня:'));
      const display=el('div','training-comment-display');
      display.setAttribute('role','note');
      display.setAttribute('tabindex','0');
      display.setAttribute('aria-label',`Коментар до дня: ${day.title}`);
      // Like the KBJV archive note: focus outline is allowed, but long
      // pressing/tapping must not select text or trigger the iOS callout.
      display.addEventListener('contextmenu',event=>event.preventDefault());
      display.addEventListener('dragstart',event=>event.preventDefault());
      display.textContent=day.comment || 'Коментар відсутній.';
      display.classList.toggle('is-empty',!day.comment);
      const textarea=el('textarea','training-comment-editor');
      textarea.maxLength=1500;textarea.rows=3;textarea.value=day.comment || '';
      textarea.hidden=true;
      textarea.setAttribute('aria-label',`Редагування коментаря: ${day.title}`);
      textarea.setAttribute('autocomplete','off');
      const actions=el('div','training-comment-actions');
      const edit=el('button','','Редагувати'),clear=el('button','','Очистити'),copy=el('button','','Скопіювати');
      [edit,clear,copy].forEach(button=>{button.type='button';button.dataset.originalText=button.textContent;});
      let editing=false;
      function finishEdit(){
        editing=false;dayEditing=false;
        display.hidden=false;textarea.hidden=true;
        commentEditState(edit,false);
      }
      edit.addEventListener('click',async()=>{
        if(!loaded || planBusy) return;
        if(!editing){
          editing=true;dayEditing=true;textarea.value=day.comment || '';
          display.hidden=true;textarea.hidden=false;commentEditState(edit,true);
          textarea.focus({preventScroll:true});
          return;
        }
        const next=textarea.value.trim();
        if(next===day.comment){
          finishEdit();
          feedback(edit,'Без змін','error');return;
        }
        // Retain the edit view if a local write fails, to avoid losing input.
        const previous=day.comment,versionBackup={archiveVersion:plan.archiveVersion,archiveUpdatedAt:plan.archiveUpdatedAt};
        try{
          day.comment=next;setVersion(plan);
          await markDirty('plan');
          if(!await savePlan('day_comment_saved'))throw new Error('Помилка локального збереження.');
        }catch(error){
          day.comment=previous;Object.assign(plan,versionBackup);
          feedback(edit,'Не збережено','error');
          return;
        }
        display.textContent=next || 'Коментар відсутній.';
        display.classList.toggle('is-empty',!next);
        finishEdit();
        feedback(edit,'Збережено','success');notifyStats();queueSync(20);
      });
      clear.addEventListener('click',async()=>{
        if(!loaded || planBusy) return;
        if(!day.comment && !textarea.value){feedback(clear,'Немає що очищати','error');return;}
        if(!window.confirm(`Очистити коментар до «${day.title}»?`))return;
        const previous=day.comment,versionBackup={archiveVersion:plan.archiveVersion,archiveUpdatedAt:plan.archiveUpdatedAt};
        try{
          day.comment='';setVersion(plan);
          await markDirty('plan');
          if(!await savePlan('day_comment_saved'))throw new Error('Помилка локального збереження.');
        }catch(error){
          day.comment=previous;Object.assign(plan,versionBackup);
          feedback(clear,'Не очищено','error');return;
        }
        textarea.value='';
        display.textContent='Коментар відсутній.';display.classList.add('is-empty');
        finishEdit();
        feedback(clear,'Очищено','success');notifyStats();queueSync(20);
      });
      copy.addEventListener('click',async()=>{
        if(!day.comment){feedback(copy,'Немає що копіювати','error');return;}
        try{await navigator.clipboard.writeText(day.comment);feedback(copy,'Скопійовано','success');log('day_comment_copied');}
        catch(_){feedback(copy,'Не скопійовано','error');}
      });
      actions.append(edit,clear,copy);comments.append(display,textarea,actions);section.append(comments);
      content.append(section);
    });
  }
  function sizeLabel(bytes) {
    return bytes >= 1024*1024 ? `${(bytes/(1024*1024)).toFixed(2)} МБ` : `${Math.ceil(bytes/1024)} КБ`;
  }
  function renderPdfs() {
    pdfContent.replaceChildren();
    notifyStats();
    if (!loaded) return;
    documents.forEach((doc, index) => {
      const slot = index + 1;
      const card = el('div','training-pdf-item');
      const details = el('div','training-pdf-details');
      details.append(el('strong','',`PDF ${slot}`));
      if (doc) {
        details.append(el('span','training-pdf-name',doc.name));
        details.append(el('small','training-pdf-size',sizeLabel(doc.size || 0)));
      } else details.append(el('span','training-pdf-empty','Файл не завантажено'));
      card.append(details);
      if (doc) {
        const actions = el('div','training-pdf-actions');
        const preview = el('button','', 'Переглянути');
        const download = el('button','', 'Завантажити');
        const replace = el('button','', 'Замінити');
        const remove = el('button','training-pdf-delete', 'Видалити');
        [preview, download, replace, remove].forEach(b=>b.type='button');
        preview.addEventListener('click', () => void previewPdf(slot, preview));
        download.addEventListener('click', () => void downloadPdf(slot, download));
        replace.addEventListener('click', () => {
          if (pdfBusy || !loaded) return;
          pdfReplaceSlot = slot;pdfUploadSource=replace;
          pdfReplaceInput.click();
        });
        remove.addEventListener('click', () => void removePdf(slot));
        actions.append(preview,download,replace,remove);
        card.append(actions);
      }
      pdfContent.append(card);
    });
    setBusy('pdf',pdfBusy);
  }
  function safePdf(file) {
    if (!file || !/\.pdf$/i.test(file.name) || (file.type && file.type !== 'application/pdf')) throw new Error('Потрібен PDF-файл (.pdf).');
    if (!file.size) throw new Error('PDF-файл порожній.');
    if (file.size > MAX_PDF_SIZE) throw new Error('Один PDF не повинен перевищувати 30 МБ.');
  }
  // Зберігати байти без читання чи аналізу вмісту PDF.
  const pdfRecord = (file) => ({
    name:file.name.slice(0,180),size:file.size,savedAt:new Date().toISOString(),
    blob:file.slice(0,file.size,'application/pdf')
  });
  async function storePdfs(files, targetSlot = null, sourceButton = null) {
    if (!loaded || pdfBusy || !files.length) return;
    if (files.length > 2 || (targetSlot !== null && files.length !== 1)) {
      status(pdfStatus,'Можна вибрати не більш як два PDF. Для заміни використайте кнопку «Замінити».','error');
      feedback(pdfAddButton,'Забагато файлів','error');
      return;
    }
    try { files.forEach(safePdf); }
    catch (error) { status(pdfStatus,error.message,'error');feedback(pdfAddButton,'Невірний PDF','error');return; }
    const slots = targetSlot === null ? [1,2].filter(slot => !documents[slot-1]).slice(0,files.length) : [targetSlot];
    if (slots.length !== files.length) {
      status(pdfStatus,'Для нових PDF немає вільних місць. Спершу видаліть файл або скористайтеся «Замінити».','error');
      feedback(pdfAddButton,'Місця зайняті','error');
      return;
    }
    if (targetSlot !== null && documents[targetSlot-1] &&
      !window.confirm(`Замінити PDF ${targetSlot}?\n\nПопередній файл буде безповоротно видалено з цього локального сховища.`)) {
      status(pdfStatus,'Заміну PDF скасовано.');
      return;
    }
    setBusy('pdf',true);
    const id = userId;
    const currentEpoch = epoch;
    const replacing = targetSlot !== null && Boolean(documents[targetSlot-1]);
    try {
      // PDF, метадані версії та ознаки синхронізації зберігаються атомарно.
      // Помилка запису не може залишити новий PDF зі старою версією архіву.
      const newRecords=files.map(pdfRecord);
      const nextPlan=plan?JSON.parse(JSON.stringify(plan)):null;
      if(nextPlan)setVersion(nextPlan);
      const nextMeta={...defaultMeta(),...syncMeta,
        pdfRevisions:[...(syncMeta?.pdfRevisions||[null,null])],
        dirtyPdfs:[...(syncMeta?.dirtyPdfs||[false,false])],
        dirtyPlan:Boolean(syncMeta?.dirtyPlan||nextPlan)};
      slots.forEach(slot=>{nextMeta.dirtyPdfs[slot-1]=true;});
      const db=await openDB();
      await new Promise((resolve,reject)=>{
        const tx=db.transaction([PDF_STORE,PLAN_STORE,META_STORE],'readwrite');
        const store=tx.objectStore(PDF_STORE);
        newRecords.forEach((record,index)=>store.put(record,pdfKey(id,slots[index])));
        if(nextPlan)tx.objectStore(PLAN_STORE).put({plan:nextPlan,savedAt:new Date().toISOString()},id);
        tx.objectStore(META_STORE).put(nextMeta,id);
        tx.oncomplete=resolve;
        tx.onerror=()=>reject(tx.error||new Error('Не вдалося записати PDF.'));
        tx.onabort=()=>reject(tx.error||new Error('Не вдалося зберегти PDF: перевірте вільне місце браузера.'));
      });
      if(id!==userId||currentEpoch!==epoch)return;
      slots.forEach((slot,i)=>{documents[slot-1]=newRecords[i];});
      if(nextPlan)plan=nextPlan;
      syncMeta=nextMeta;renderPdfs();notifyStats();
      status(pdfStatus,replacing?'PDF замінено й збережено на цьому пристрої.':
        `${files.length === 2 ? 'Обидва PDF' : 'PDF'} завантажено й збережено на цьому пристрої.`,'success');
      feedback(sourceButton || pdfAddButton,replacing?'Замінено':'Додано');
      log(replacing?'pdf_replaced':'pdf_added');queueSync(20);
      // На підтримуваних платформах просимо захист від автоматичного видалення даних.
      if (navigator.storage?.persist) navigator.storage.persist().catch(()=>{});
    } catch (error) {
      status(pdfStatus,`Помилка збереження PDF: ${error.message}. Попередні файли залишилися без змін.`,'error');
      feedback(sourceButton||pdfAddButton,'Не збережено','error');
    } finally { setBusy('pdf',false); }
  }
  async function removePdf(slot) {
    if (!loaded || pdfBusy || !documents[slot-1]) return;
    if (!window.confirm(`Видалити PDF ${slot}?\n\nФайл буде остаточно видалено з локального сховища. План тренування не зміниться.`)) return;
    setBusy('pdf',true);
    const id=userId;
    const currentEpoch=epoch;
    try {
      const nextPlan=plan?JSON.parse(JSON.stringify(plan)):null;
      if(nextPlan)setVersion(nextPlan);
      const nextMeta={...defaultMeta(),...syncMeta,
        pdfRevisions:[...(syncMeta?.pdfRevisions||[null,null])],
        dirtyPdfs:[...(syncMeta?.dirtyPdfs||[false,false])],
        dirtyPlan:Boolean(syncMeta?.dirtyPlan||nextPlan)};
      nextMeta.dirtyPdfs[slot-1]=true;
      const db=await openDB();
      await new Promise((resolve,reject)=>{
        const tx=db.transaction([PLAN_STORE,PDF_STORE,META_STORE],'readwrite');
        tx.objectStore(PDF_STORE).delete(pdfKey(id,slot));
        if(nextPlan)tx.objectStore(PLAN_STORE).put({plan:nextPlan,savedAt:new Date().toISOString()},id);
        tx.objectStore(META_STORE).put(nextMeta,id);
        tx.oncomplete=resolve;
        tx.onerror=()=>reject(tx.error||new Error('Не вдалося видалити PDF.'));
        tx.onabort=()=>reject(tx.error||new Error('Видалення PDF скасовано.'));
      });
      if(id!==userId||currentEpoch!==epoch)return;
      documents[slot-1]=null; if(nextPlan)plan=nextPlan; syncMeta=nextMeta;
      renderPdfs();
      status(pdfStatus,`PDF ${slot} видалено.`,'error');
      log('pdf_deleted');queueSync(20);
    } catch(error) { status(pdfStatus,`PDF не видалено: ${error.message}.`,'error'); }
    finally { setBusy('pdf',false); }
  }
  function blobUrl(blob) {
    const url=URL.createObjectURL(blob);
    objectUrls.add(url);
    return url;
  }
  function previewPdf(slot, button) {
    if (!loaded || pdfBusy || !documents[slot-1]) return;
    const file = documents[slot-1];
    if (!(file.blob instanceof Blob)) {
      status(pdfStatus,'PDF недоступний у локальному сховищі.','error');
      feedback(button,'Не відкрито','error');
      return;
    }
    // Посилання створюється безпосередньо у події натискання —
    // важливо для iOS Safari, який блокує асинхронне відкриття вкладок.
    const url = blobUrl(file.blob);
    const tab = window.open(url,'_blank');
    if (!tab) {
      status(pdfStatus,'Браузер заблокував відкриття PDF. Дозвольте нові вкладки або завантажте файл.','error');
      feedback(button,'Не відкрито','error');
      return;
    }
    try { tab.opener = null; } catch (_) {}
    feedback(button,'Відкрито');
    log('pdf_viewed');
  }
  function downloadPdf(slot, button) {
    if (!loaded || pdfBusy || !documents[slot-1]) return;
    const file = documents[slot-1];
    if (!(file.blob instanceof Blob)) {
      status(pdfStatus,'PDF недоступний у локальному сховищі.','error');
      feedback(button,'Не завантажено','error');
      return;
    }
    try {
      const anchor=document.createElement('a');
      anchor.href=blobUrl(file.blob);
      anchor.download=file.name || `document-${slot}.pdf`;
      anchor.style.display='none';
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      feedback(button,'Завантажено');
      log('pdf_downloaded');
    } catch(error) {
      status(pdfStatus,`Не вдалося завантажити PDF: ${error.message}`,'error');
      feedback(button,'Не завантажено','error');
    }
  }
  window.addEventListener('pagehide', () => { objectUrls.forEach(url=>URL.revokeObjectURL(url));objectUrls.clear(); });
  async function switchUser(id) {
    const next=String(id||'');
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(next)) return;
    if (next===userId && loaded) return;
    const currentEpoch=++epoch;
    userId=next;
    plan=null;
    documents=[null,null];
    syncMeta=defaultMeta();lastRemoteState=null;conflictDetected=false;conflictActions.hidden=true;
    corrupt=false;
    loaded=false;
    status(statusNode,'Завантаження локального плану...');
    status(pdfStatus,'Завантаження збережених PDF...');
    content.replaceChildren();pdfContent.replaceChildren();
    setBusy('plan',false);setBusy('pdf',false);
    try {
      await writeQueue.catch(()=>{});
      const [record,pdf1,pdf2,storedMeta]=await Promise.all([
        dbRead(PLAN_STORE,next), dbRead(PDF_STORE,pdfKey(next,1)), dbRead(PDF_STORE,pdfKey(next,2)),dbRead(META_STORE,next)
      ]);
      syncMeta=storedMeta ? {...defaultMeta(),...storedMeta} : defaultMeta();
      if (currentEpoch!==epoch) return;
      if (record?.plan) {
        try { plan=normalize(record.plan,true); }
        catch (_) { corrupt=true; }
      }
      documents=[pdf1,pdf2];
      loaded=true;
      setBusy('plan',false);setBusy('pdf',false);
      renderPlan();renderPdfs();
      status(statusNode,corrupt?'Збережений план пошкоджений: замініть або очистіть його.':
        plan?'Локальний план завантажено. Перевірка синхронізації…':'Перевірка синхронізації…',corrupt?'error':'');
      status(pdfStatus,'Перевірка PDF на сервері…');
      queueSync(50);
    } catch(error) {
      if (currentEpoch!==epoch) return;
      status(statusNode,`Сховище недоступне: ${error.message}. Дії вимкнено для захисту даних.`,'error');
      status(pdfStatus,'PDF-сховище недоступне.','error');
    }
  }
  // Synchronisation metadata stays in a distinct IndexedDB object store.
  async function markDirty(kind,slot=0) {
    if(!syncMeta || !userId) return;
    if(kind==='plan')syncMeta.dirtyPlan=true;
    else syncMeta.dirtyPdfs[slot-1]=true;
    await dbMutation(META_STORE,'put',userId,syncMeta);
  }
  async function saveMeta(id=userId) {
    if(!id || !syncMeta)return;
    await dbMutation(META_STORE,'put',id,JSON.parse(JSON.stringify(syncMeta)));
  }
  function authToken() {
    for(const storage of [localStorage,sessionStorage]){
      for(const key of ['kbjv_8321_auth_session','kbjv_8321_auth_session_temp']){
        try{const saved=JSON.parse(storage.getItem(key)||'null');
          if(saved?.token && String(saved.user?.id)===userId)return saved.token;
        }catch(_){}
      }
    }
    return '';
  }
  async function remote(path,{method='GET',body}={}) {
    const token=authToken();
    if(!token)throw new Error('Немає активної сесії для синхронізації.');
    const response=await fetch(AUTH_URL+path,{
      method,headers:{Authorization:`Bearer ${token}`,...(body===undefined?{}:{'Content-Type':'application/json'})},
      body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'
    });
    let result=null;
    try{result=await response.json();}catch(_){}
    if(!response.ok){
      const error=new Error(response.status===404?'Для синхронізації потрібен Worker v95.':result?.error||`HTTP ${response.status}`);
      error.status=response.status;throw error;
    }
    return result;
  }
  function queueSync(delay=700) {
    clearTimeout(syncTimer);
    if(!userId || !loaded)return;
    syncTimer=setTimeout(()=>void reconcile(),delay);
  }
  function currentPlanJSON(){return JSON.stringify(plan);}
  async function uploadPlan(id,base) {
    const snapshot=currentPlanJSON();
    const answer=await remote('/training/plan',{method:'POST',body:{plan,base_revision:base}});
    if(id!==userId)return;
    syncMeta.planRevision=answer.revision;
    syncMeta.dirtyPlan=currentPlanJSON()!==snapshot;
    await saveMeta(id);
  }
  function uint8ToBase64(bytes) {
    let binary='';
    // One small (96 KiB) chunk; no memory explosion and no content parsing.
    for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
    return btoa(binary);
  }
  function base64ToBytes(encoded) {
    const decoded=atob(encoded),out=new Uint8Array(decoded.length);
    for(let i=0;i<decoded.length;i++)out[i]=decoded.charCodeAt(i);
    return out;
  }
  async function uploadPdf(id,slot,base) {
    const file=documents[slot-1];
    if(!file){
      const result=await remote(`/training/pdf/${slot}`,{method:'DELETE',body:{base_revision:base}});
      if(id!==userId)return;
      syncMeta.pdfRevisions[slot-1]=result.revision;
      syncMeta.dirtyPdfs[slot-1]=false;
      await saveMeta(id);return;
    }
    const data=file.blob;
    if(!(data instanceof Blob))throw new Error(`PDF ${slot}: локальні байти недоступні.`);
    if(data.size>MAX_PDF_SIZE)throw new Error('PDF завеликий для синхронізації.');
    const count=Math.ceil(data.size/TRAINING_CHUNK_SIZE);
    const started=await remote('/training/pdf/start',{method:'POST',body:{slot,name:file.name,size:data.size,chunks:count,base_revision:base}});
    for(let index=0;index<count;index++){
      if(id!==userId)return;
      const bytes=new Uint8Array(await data.slice(index*TRAINING_CHUNK_SIZE,(index+1)*TRAINING_CHUNK_SIZE).arrayBuffer());
      await remote('/training/pdf/chunk',{method:'POST',body:{upload_id:started.upload_id,index,data:uint8ToBase64(bytes)}});
    }
    const committed=await remote('/training/pdf/commit',{method:'POST',body:{upload_id:started.upload_id}});
    if(id!==userId)return;
    syncMeta.pdfRevisions[slot-1]=committed.revision;
    syncMeta.dirtyPdfs[slot-1]=documents[slot-1]!==file;
    await saveMeta(id);
  }
  async function downloadRemotePdf(id,slot,meta){
    if(!meta.name)return null;
    const parts=[];let length=0;
    for(let i=0;i<meta.chunks;i++){
      if(id!==userId)throw new Error('Акаунт змінено під час синхронізації.');
      const result=await remote(`/training/pdf/${slot}/chunk/${i}`);
      const bytes=base64ToBytes(result.data);
      parts.push(bytes);length+=bytes.length;
    }
    if(length!==meta.size)throw new Error(`Розмір PDF ${slot} не збігається із серверним.`);
    return {name:meta.name,size:meta.size,blob:new Blob(parts,{type:'application/pdf'}),savedAt:meta.updated_at};
  }
  async function reconcile(){
    if(syncActive || !loaded || !userId || !navigator.onLine)return;
    if(dayEditing){queueSync(1200);return;}
    syncActive=true;
    const id=userId,nowEpoch=epoch;
    try{
      const state=await remote('/training/state');
      if(id!==userId||nowEpoch!==epoch)return;
      lastRemoteState=state;
      conflictDetected=false;
      const remotePlan=state.plan;
      if(syncMeta.planRevision===null){
        if(plan || corrupt){
          if(remotePlan.value && currentPlanJSON()!==JSON.stringify(normalize(remotePlan.value,true))){
            conflictDetected=true;
          }else if(!remotePlan.value){syncMeta.planRevision=remotePlan.revision;syncMeta.dirtyPlan=true;}
          else syncMeta.planRevision=remotePlan.revision;
        } else syncMeta.planRevision=remotePlan.revision;
      }
      if(!conflictDetected && syncMeta.dirtyPlan){
        if(syncMeta.planRevision!==remotePlan.revision){conflictDetected=true;}
        else await uploadPlan(id,remotePlan.revision);
      }else if(!conflictDetected && syncMeta.planRevision!==remotePlan.revision){
        const next=remotePlan.value?normalize(remotePlan.value,true):null;
        await dbMutation(PLAN_STORE,next?'put':'delete',id,next?{plan:next,savedAt:new Date().toISOString()}:null);
        if(id!==userId)return;
        plan=next;corrupt=false;syncMeta.planRevision=remotePlan.revision;renderPlan();
      }else if(!conflictDetected && !plan && remotePlan.value && syncMeta.planRevision===remotePlan.revision){
        // First visit on another device: fetch missing plan even if rev=0/previous meta.
        plan=normalize(remotePlan.value,true);
        await dbMutation(PLAN_STORE,'put',id,{plan,savedAt:new Date().toISOString()});renderPlan();
      }
      for(let slot=1;slot<=2;slot++){
        const info=state.pdf.find(x=>x.slot===slot);
        if(!info)continue;
        const idx=slot-1;
        if(syncMeta.pdfRevisions[idx]===null){
          if(documents[idx]){
            if(!info.name){syncMeta.pdfRevisions[idx]=info.revision;syncMeta.dirtyPdfs[idx]=true;}
            else if(info.name===documents[idx].name && info.size===documents[idx].size)syncMeta.pdfRevisions[idx]=info.revision;
            else {conflictDetected=true;continue;}
          }else syncMeta.pdfRevisions[idx]=info.revision;
        }
        if(syncMeta.dirtyPdfs[idx]){
          if(syncMeta.pdfRevisions[idx]!==info.revision){conflictDetected=true;continue;}
          await uploadPdf(id,slot,info.revision);
        }else if(syncMeta.pdfRevisions[idx]!==info.revision || (!documents[idx]&&info.name)){
          const doc=await downloadRemotePdf(id,slot,info);
          await dbMutation(PDF_STORE,doc?'put':'delete',pdfKey(id,slot),doc);
          if(id!==userId)return;
          documents[idx]=doc;syncMeta.pdfRevisions[idx]=info.revision;
          renderPdfs();
        }
      }
      if(id!==userId)return;
      await saveMeta(id);
      conflictActions.hidden=!conflictDetected;
      if(conflictDetected){
        status(statusNode,'Конфлікт версій: локальні дані не перезаписано. Завантажте ZIP перед вирішенням конфлікту.','error');
        status(pdfStatus,'Є відмінності між пристроями. Локальні файли збережені.','error');
      }else if(syncMeta.dirtyPlan||syncMeta.dirtyPdfs.some(Boolean)){
        status(statusNode,'Зміни збережені локально; продовжується передавання на сервер.');
      }else{
        status(statusNode,plan?'План і коментарі синхронізовані.':'План відсутній — синхронізацію перевірено.','success');
        status(pdfStatus,documents.some(Boolean)?'Збережені PDF синхронізовані.':'PDF ще не завантажено.','success');
      }
      lastSyncError='';notifyStats();
    }catch(error){
      if(id===userId){
        lastSyncError=String(error.message||error);notifyStats();
        status(statusNode,`Локальна копія збережена. Сервер: ${lastSyncError}`,'error');
        status(pdfStatus,`Синхронізація PDF недоступна: ${lastSyncError}`,'error');
      }
    }finally{
      syncActive=false;
      if(id===userId && (syncMeta?.dirtyPlan||syncMeta?.dirtyPdfs.some(Boolean)) && !conflictDetected && !lastSyncError)
        queueSync(1400);
    }
  }
  useLocalButton.addEventListener('click',async()=>{
    if(!conflictDetected || !lastRemoteState)return;
    if(!window.confirm('Замінити серверний план і PDF локальними даними?\n\nЦе перезапише версію на інших пристроях. Рекомендуємо спершу вивантажити ZIP з локального пристрою.'))return;
    syncMeta.planRevision=Number(lastRemoteState.plan.revision);
    syncMeta.pdfRevisions=lastRemoteState.pdf.map(x=>Number(x.revision));
    syncMeta.dirtyPlan=true;syncMeta.dirtyPdfs=[true,true];
    await saveMeta();
    conflictDetected=false;conflictActions.hidden=true;
    feedback(useLocalButton,'Обрано');queueSync(30);
  });
  useCloudButton.addEventListener('click',async()=>{
    if(!conflictDetected || !lastRemoteState)return;
    if(!window.confirm('Завантажити серверну версію і замінити всі локальні тренувальні дані?\n\nПеред підтвердженням збережіть локальну копію ZIP, інакше її буде втрачено.'))return;
    setBusy('plan',true);setBusy('pdf',true);
    const id=userId,nowEpoch=epoch;
    try{
      const latest=await remote('/training/state');
      const next=latest.plan.value?normalize(latest.plan.value,true):null;
      const docs=[];
      for(let slot=1;slot<=2;slot++)docs.push(await downloadRemotePdf(id,slot,latest.pdf.find(x=>x.slot===slot)));
      if(id!==userId||nowEpoch!==epoch)return;
      const newMeta={planRevision:latest.plan.revision,pdfRevisions:latest.pdf.map(x=>Number(x.revision)),dirtyPlan:false,dirtyPdfs:[false,false]};
      const db=await openDB();
      await new Promise((resolve,reject)=>{
        const tx=db.transaction([PLAN_STORE,PDF_STORE,META_STORE],'readwrite');
        if(next)tx.objectStore(PLAN_STORE).put({plan:next,savedAt:new Date().toISOString()},id);
        else tx.objectStore(PLAN_STORE).delete(id);
        for(let slot=1;slot<=2;slot++){
          if(docs[slot-1])tx.objectStore(PDF_STORE).put(docs[slot-1],pdfKey(id,slot));
          else tx.objectStore(PDF_STORE).delete(pdfKey(id,slot));
        }
        tx.objectStore(META_STORE).put(newMeta,id);
        tx.oncomplete=resolve;
        tx.onerror=()=>reject(tx.error||new Error('Не вдалося записати серверні дані.'));
        tx.onabort=()=>reject(tx.error||new Error('Відновлення із сервера скасовано.'));
      });
      plan=next;documents=docs;syncMeta=newMeta;conflictDetected=false;corrupt=false;
      conflictActions.hidden=true;renderPlan();renderPdfs();
      status(statusNode,'Серверну версію завантажено.','success');feedback(useCloudButton,'Завантажено');
    }catch(error){status(statusNode,`Не вдалося завантажити: ${error.message}`,'error');feedback(useCloudButton,'Помилка','error');}
    finally{setBusy('plan',false);setBusy('pdf',false);}
  });
  function downloadBlob(file,name){
    const url=blobUrl(file),a=document.createElement('a');
    a.href=url;a.download=name;a.style.display='none';document.body.append(a);a.click();a.remove();
    setTimeout(()=>{URL.revokeObjectURL(url);objectUrls.delete(url);},60000);
  }
  const exportablePlan=()=>normalize(plan,false); // remove legacy exercise checkmarks/comments from v145 exports
  async function bumpForExtract(){
    if(!plan)throw new Error('Немає плану для витягу.');
    const old=JSON.parse(JSON.stringify(plan));
    setVersion(plan);
    try{
      await dbMutation(PLAN_STORE,'put',userId,{plan:JSON.parse(JSON.stringify(plan)),savedAt:new Date().toISOString()});
      await markDirty('plan');notifyStats();queueSync(20);
    }catch(error){plan=old;throw error;}
  }
  extractButton.addEventListener('click',async()=>{
    if(!plan){feedback(extractButton,'Немає що формувати','error');return;}
    if(planBusy||pdfBusy)return;
    setBusy('plan',true);
    try{
      await bumpForExtract();
      downloadBlob(new Blob([JSON.stringify(exportablePlan(),null,2)],{type:'application/json'}),`training-plan-v${archiveVersion()}.json`);
      feedback(extractButton,'Сформовано');log('extract_downloaded');
    }catch(error){status(packageStatus,`Не створено витяг: ${error.message}`,'error');feedback(extractButton,'Помилка','error');}
    finally{setBusy('plan',false);}
  });
  packageExportButton.addEventListener('click',async()=>{
    if(!plan){feedback(packageExportButton,'Немає плану','error');return;}
    if(documents.some(x=>!x?.blob)){feedback(packageExportButton,'Потрібні два PDF','error');
      status(packageStatus,'Для повного ZIP потрібні план і обидва PDF. Окремий JSON доступний через «Сформувати витяг».','error');return;}
    try{
      if(typeof JSZip==='undefined')throw new Error('Модуль ZIP недоступний.');
      setBusy('plan',true);setBusy('pdf',true);
      status(packageStatus,'Формування ZIP…');
      const previousPlan=plan;
      const nextPlan=JSON.parse(JSON.stringify(plan));setVersion(nextPlan);
      const zip=new JSZip();
      zip.file('training-plan.json',JSON.stringify(normalize(nextPlan),null,2));
      zip.file('document-1.pdf',documents[0].blob,{compression:'STORE'});
      zip.file('document-2.pdf',documents[1].blob,{compression:'STORE'});
      const archive=await zip.generateAsync({type:'blob',compression:'STORE'});
      // Only assign an advanced version once ZIP creation succeeds.
      await dbMutation(PLAN_STORE,'put',userId,{plan:nextPlan,savedAt:new Date().toISOString()});
      await markDirty('plan');
      plan=nextPlan;notifyStats();queueSync(20);
      downloadBlob(archive,`training-week-v${archiveVersion()}.zip`);
      status(packageStatus,'ZIP містить план з коментарями та два PDF.','success');
      feedback(packageExportButton,'Завантажено');log('package_exported');
    }catch(error){status(packageStatus,`Не вдалося створити ZIP: ${error.message}`,'error');feedback(packageExportButton,'Помилка ZIP','error');}
    finally{setBusy('plan',false);setBusy('pdf',false);}
  });
  packageImportButton.addEventListener('click',()=>{if(loaded&&!planBusy&&!pdfBusy)packageInput.click();});
  packageInput.addEventListener('change',async()=>{
    const file=packageInput.files?.[0];packageInput.value='';
    if(!file)return;
    if(!/\.zip$/i.test(file.name) || file.size>70*1024*1024){status(packageStatus,'Потрібен ZIP до 70 МБ.','error');return;}
    let nextPlan,docs;
    try{
      if(typeof JSZip==='undefined')throw new Error('Модуль ZIP недоступний.');
      const zip=await JSZip.loadAsync(file,{checkCRC32:false});
      const names=['training-plan.json','document-1.pdf','document-2.pdf'];
      for(const name of names)if(!zip.file(name))throw new Error(`У ZIP немає ${name}.`);
      // Reject oversized ZIP entries BEFORE decompressing. Prevents accidental giant archives.
      if(zip.file('training-plan.json')._data?.uncompressedSize>MAX_PLAN_SIZE)throw new Error('JSON перевищує 1 МБ.');
      for(let slot=1;slot<=2;slot++){
        if(zip.file(`document-${slot}.pdf`)._data?.uncompressedSize>MAX_PDF_SIZE)throw new Error(`PDF ${slot} перевищує 30 МБ.`);
      }
      const extras=Object.keys(zip.files).filter(x=>!zip.files[x].dir&&!names.includes(x));
      if(extras.length)throw new Error(`Зайві файли в ZIP: ${extras.join(', ').slice(0,100)}.`);
      const text=await zip.file(names[0]).async('string');
      if(new TextEncoder().encode(text).length>MAX_PLAN_SIZE)throw new Error('JSON перевищує 1 МБ.');
      nextPlan=normalize(JSON.parse(text));
      docs=[];
      for(let i=1;i<=2;i++){
        const entry=zip.file(`document-${i}.pdf`);
        if(entry._data?.uncompressedSize>MAX_PDF_SIZE)throw new Error(`PDF ${i} перевищує 30 МБ.`);
        const blob=await entry.async('blob');
        const pdf=new File([blob],`document-${i}.pdf`,{type:'application/pdf'});
        safePdf(pdf);docs.push(pdfRecord(pdf));
      }
    }catch(error){status(packageStatus,`ZIP не імпортовано: ${error.message}`,'error');feedback(packageImportButton,'Невірний ZIP','error');return;}
    try {
      const planSame=JSON.stringify(contentOnly(plan))===JSON.stringify(contentOnly(nextPlan));
      const pdfSame=await identicalDocuments(documents[0],docs[0])&&await identicalDocuments(documents[1],docs[1]);
      if(planSame&&pdfSame){feedback(packageImportButton,'Без змін','error');status(packageStatus,'Файли ZIP збігаються з поточними: версія не змінена.');return;}
    }catch(error){status(packageStatus,`Не вдалося порівняти ZIP: ${error.message}`,'error');return;}
    setVersion(nextPlan); // Зберігаємо вищу версію із зовнішнього ZIP.
    if(!window.confirm('Замінити план і обидва PDF одним архівом?\n\nПопередній план, коментарі та два PDF буде замінено. Для збереження старих даних попередньо завантажте ZIP.'))return;
    const id=userId,currentEpoch=epoch;
    setBusy('plan',true);setBusy('pdf',true);
    try{
      // All three documents + sync metadata in one IndexedDB transaction.
      const db=await openDB();
      const newMeta={...(syncMeta||defaultMeta()),dirtyPlan:true,dirtyPdfs:[true,true]};
      await new Promise((resolve,reject)=>{
        const tx=db.transaction([PLAN_STORE,PDF_STORE,META_STORE],'readwrite');
        tx.objectStore(PLAN_STORE).put({plan:nextPlan,savedAt:new Date().toISOString()},id);
        tx.objectStore(PDF_STORE).put(docs[0],pdfKey(id,1));
        tx.objectStore(PDF_STORE).put(docs[1],pdfKey(id,2));
        tx.objectStore(META_STORE).put(newMeta,id);
        tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||new Error('Помилка запису ZIP.'));
        tx.onabort=()=>reject(tx.error||new Error('Транзакцію імпорту ZIP скасовано.'));
      });
      if(id!==userId||currentEpoch!==epoch)return;
      plan=nextPlan;documents=docs;syncMeta=newMeta;corrupt=false;
      renderPlan();renderPdfs();
      status(packageStatus,'ZIP розпаковано: план і два PDF збережені локально. Синхронізація починається автоматично.','success');
      feedback(packageImportButton,'Імпортовано');log('package_imported');queueSync(20);
    }catch(error){status(packageStatus,`Помилка імпорту: ${error.message}. Попередні дані не змінено.`,'error');feedback(packageImportButton,'Не імпортовано','error');}
    finally{setBusy('plan',false);setBusy('pdf',false);}
  });
  window.addEventListener('focus',()=>queueSync(300));
  window.addEventListener('online',()=>queueSync(300));
  setInterval(()=>{if(document.visibilityState==='visible')queueSync(50);},20000);

  loadButton.addEventListener('click',()=>{ if (loaded&&!planBusy) fileInput.click(); });
  fileInput.addEventListener('change',async()=>{
    const file=fileInput.files?.[0]; fileInput.value='';
    if (!file||!loaded||planBusy) return;
    if (file.size>MAX_PLAN_SIZE) {status(statusNode,'Максимальний розмір JSON — 1 МБ.','error');feedback(loadButton,'Невірний файл','error');return;}
    let next;
    try { next=normalize(JSON.parse(await file.text())); }
    catch(error) {status(statusNode,`Помилка JSON: ${error.message}`,'error');feedback(loadButton,'Невірний файл','error');return;}
    if(!corrupt&&JSON.stringify(contentOnly(plan))===JSON.stringify(contentOnly(next))){
      feedback(loadButton,'Без змін','error');status(statusNode,'План не змінився, версію збережено.');return;
    }
    setVersion(next);
    const replacing=Boolean(plan||corrupt);
    if (replacing&&!window.confirm('Замінити поточний план тренування?\n\nПопередній план та коментарі до днів будуть видалені. Два збережені PDF не зміняться.')) return;
    setBusy('plan',true);
    const id=userId;const currentEpoch=epoch;
    try {
      await writeQueue.catch(()=>{});
      await dbMutation(PLAN_STORE,'put',id,{plan:next,savedAt:new Date().toISOString()});
      await markDirty('plan');
      if (id!==userId||currentEpoch!==epoch) return;
      plan=next;corrupt=false;renderPlan();
      status(statusNode,replacing?'План замінено і збережено.':'План додано і збережено.','success');
      feedback(loadButton,replacing?'Замінено':'Завантажено');
      log(replacing?'plan_replaced':'plan_added');queueSync(20);
    } catch(error) {status(statusNode,`Не вдалося зберегти план: ${error.message}. Старий план не змінено.`,'error');feedback(loadButton,'Не збережено','error');}
    finally {setBusy('plan',false);}
  });
  clearButton.addEventListener('click',async()=>{
    if (!loaded||planBusy) return;
    if (!plan&&!corrupt) {feedback(clearButton,'Немає що очищати','error');status(statusNode,'План вже порожній.');return;}
    if (!window.confirm('Очистити план тренування?\n\nВсі дні, вправи та коментарі до днів будуть видалені без можливості відновлення. Збережені PDF залишаться.')) return;
    setBusy('plan',true);
    const id=userId;const currentEpoch=epoch;
    try {
      await writeQueue.catch(()=>{});
      await dbMutation(PLAN_STORE,'delete',id);
      await markDirty('plan');
      if (id!==userId||currentEpoch!==epoch) return;
      plan=null;corrupt=false;renderPlan();
      status(statusNode,'План очищено. PDF-файли збережені.','success');
      feedback(clearButton,'Очищено','error');
      log('plan_cleared');queueSync(20);
    } catch(error) {status(statusNode,`Не вдалося очистити план: ${error.message}`,'error');feedback(clearButton,'Не очищено','error');}
    finally {setBusy('plan',false);}
  });
  pdfAddButton.addEventListener('click',()=>{ if (loaded&&!pdfBusy) pdfInput.click(); });
  for(const [slot,button] of [[1,uploadPdf1Button],[2,uploadPdf2Button]]){
    button.addEventListener('click',()=>{
      if(!loaded||planBusy||pdfBusy)return;
      pdfReplaceSlot=slot;pdfUploadSource=button;pdfReplaceInput.click();
    });
  }
  exportPdf1Button.addEventListener('click',()=>{if(!documents[0])feedback(exportPdf1Button,'Немає PDF','error');else downloadPdf(1,exportPdf1Button);});
  exportPdf2Button.addEventListener('click',()=>{if(!documents[1])feedback(exportPdf2Button,'Немає PDF','error');else downloadPdf(2,exportPdf2Button);});
  pdfInput.addEventListener('change',()=>{
    const files=Array.from(pdfInput.files||[]);pdfInput.value='';
    void storePdfs(files);
  });
  pdfReplaceInput.addEventListener('change',()=>{
    const files=Array.from(pdfReplaceInput.files||[]);pdfReplaceInput.value='';
    const slot=pdfReplaceSlot,source=pdfUploadSource;pdfReplaceSlot=null;pdfUploadSource=null;
    if (slot) void storePdfs(files,slot,source);
  });
  setBusy('plan',false);setBusy('pdf',false);
  window.addEventListener('training:user',event=>{ void switchUser(event.detail?.id); });
})();
