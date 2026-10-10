document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const AUTH_API_URL = "https://kbjv-auth-api-dev.anthonybatyk.workers.dev";
  const SITE_VERSION = "v96";
  const AUTH_LOCAL_KEY = "kbjv_8321_auth_session";
  const AUTH_SESSION_KEY = "kbjv_8321_auth_session_temp";
  const LEGACY_STORAGE_KEYS = {
    PRODUCTS_KEY:"kbjv_8321_products", CALCULATOR_KEY:"kbjv_8321_calculator", ARCHIVE_KEY:"kbjv_8321_archive", ACTIVE_TAB_KEY:"kbjv_8321_active_tab",
    CALCULATOR_DRAFT_KEY:"kbjv_8321_calculator_draft", SORT_KEY:"kbjv_8321_product_sort", SORT_SCHEMA_KEY:"kbjv_8321_product_sort_v26",
    RANDOM_SORT_SEED_KEY:"kbjv_8321_product_random_seed", CATEGORY_ORDER_KEY:"kbjv_8321_category_order", CONSOLE_KEY:"kbjv_8321_console",
    EXPORT_VERSION_KEY:"kbjv_8321_export_version", DATABASE_UPDATED_KEY:"kbjv_8321_database_updated_at", EXPORT_FINGERPRINT_KEY:"kbjv_8321_export_fingerprint",
    DAILY_GOAL_KEY:"kbjv_8321_daily_goal", LAST_EXPORT_KEY:"kbjv_8321_last_export_at", LAST_IMPORT_KEY:"kbjv_8321_last_import_at", UNDO_KEY:"kbjv_8321_undo_snapshot",
    STATS_TO_TODAY_KEY:"kbjv_8321_stats_to_today", SITE_DATA_VISIBLE_KEY:"kbjv_8321_site_data_visible"
  };

  let PRODUCTS_KEY=LEGACY_STORAGE_KEYS.PRODUCTS_KEY, CALCULATOR_KEY=LEGACY_STORAGE_KEYS.CALCULATOR_KEY, ARCHIVE_KEY=LEGACY_STORAGE_KEYS.ARCHIVE_KEY;
  let ACTIVE_TAB_KEY=LEGACY_STORAGE_KEYS.ACTIVE_TAB_KEY, CALCULATOR_DRAFT_KEY=LEGACY_STORAGE_KEYS.CALCULATOR_DRAFT_KEY, SORT_KEY=LEGACY_STORAGE_KEYS.SORT_KEY;
  let SORT_SCHEMA_KEY=LEGACY_STORAGE_KEYS.SORT_SCHEMA_KEY, RANDOM_SORT_SEED_KEY=LEGACY_STORAGE_KEYS.RANDOM_SORT_SEED_KEY, CATEGORY_ORDER_KEY=LEGACY_STORAGE_KEYS.CATEGORY_ORDER_KEY;
  let CONSOLE_KEY=LEGACY_STORAGE_KEYS.CONSOLE_KEY, EXPORT_VERSION_KEY=LEGACY_STORAGE_KEYS.EXPORT_VERSION_KEY, DATABASE_UPDATED_KEY=LEGACY_STORAGE_KEYS.DATABASE_UPDATED_KEY;
  let EXPORT_FINGERPRINT_KEY=LEGACY_STORAGE_KEYS.EXPORT_FINGERPRINT_KEY, DAILY_GOAL_KEY=LEGACY_STORAGE_KEYS.DAILY_GOAL_KEY, LAST_EXPORT_KEY=LEGACY_STORAGE_KEYS.LAST_EXPORT_KEY;
  let LAST_IMPORT_KEY=LEGACY_STORAGE_KEYS.LAST_IMPORT_KEY, UNDO_KEY=LEGACY_STORAGE_KEYS.UNDO_KEY, STATS_TO_TODAY_KEY=LEGACY_STORAGE_KEYS.STATS_TO_TODAY_KEY, SITE_DATA_VISIBLE_KEY=LEGACY_STORAGE_KEYS.SITE_DATA_VISIBLE_KEY;
  let PROFILE_KEY="kbjv_8321_profile", CUSTOM_CATEGORIES_KEY="kbjv_8321_custom_categories", DELETED_DEFAULT_CATEGORIES_KEY="kbjv_8321_deleted_default_categories", DEPARTMENTS_ENABLED_KEY="kbjv_8321_departments_enabled", CALC_QUICK_PRESETS_KEY="kbjv_8321_calc_quick_presets", AUDIT_QUEUE_KEY="kbjv_8321_audit_queue";
  let SYNC_LOCAL_UPDATED_KEY="kbjv_8321_sync_local_updated_at", SYNC_REVISION_KEY="kbjv_8321_sync_revision", SYNC_DIRTY_KEY="kbjv_8321_sync_dirty", SYNC_LAST_AT_KEY="kbjv_8321_sync_last_at";

  let authUser=null, authToken="", authRemembered=false, appInitialized=false;

  function applyUserStorageNamespace(userId){
    const prefix=`kbjv_8321_user_${String(userId)}_`;
    PRODUCTS_KEY=prefix+"products"; CALCULATOR_KEY=prefix+"calculator"; ARCHIVE_KEY=prefix+"archive"; ACTIVE_TAB_KEY=prefix+"active_tab";
    CALCULATOR_DRAFT_KEY=prefix+"calculator_draft"; SORT_KEY=prefix+"product_sort"; SORT_SCHEMA_KEY=prefix+"product_sort_v26";
    RANDOM_SORT_SEED_KEY=prefix+"product_random_seed"; CATEGORY_ORDER_KEY=prefix+"category_order"; CONSOLE_KEY=prefix+"console";
    EXPORT_VERSION_KEY=prefix+"export_version"; DATABASE_UPDATED_KEY=prefix+"database_updated_at"; EXPORT_FINGERPRINT_KEY=prefix+"export_fingerprint";
    DAILY_GOAL_KEY=prefix+"daily_goal"; LAST_EXPORT_KEY=prefix+"last_export_at"; LAST_IMPORT_KEY=prefix+"last_import_at"; UNDO_KEY=prefix+"undo_snapshot";
    STATS_TO_TODAY_KEY=prefix+"stats_to_today"; SITE_DATA_VISIBLE_KEY=prefix+"site_data_visible";
    PROFILE_KEY=prefix+"profile"; CUSTOM_CATEGORIES_KEY=prefix+"custom_categories"; DELETED_DEFAULT_CATEGORIES_KEY=prefix+"deleted_default_categories"; DEPARTMENTS_ENABLED_KEY=prefix+"departments_enabled"; CALC_QUICK_PRESETS_KEY=prefix+"calc_quick_presets"; AUDIT_QUEUE_KEY=prefix+"audit_queue";
    SYNC_LOCAL_UPDATED_KEY=prefix+"sync_local_updated_at"; SYNC_REVISION_KEY=prefix+"sync_revision"; SYNC_DIRTY_KEY=prefix+"sync_dirty"; SYNC_LAST_AT_KEY=prefix+"sync_last_at";
  }

  function migrateLegacyDataToAdmin(user){
    // Старі неіменовані localStorage-дані належать лише первинному власнику сайту.
    if(!user||!user.is_owner)return;
    const marker=`kbjv_8321_legacy_migrated_v47_${user.id}`;
    if(localStorage.getItem(marker)==="1")return;
    const pairs=[
      [LEGACY_STORAGE_KEYS.PRODUCTS_KEY,PRODUCTS_KEY],[LEGACY_STORAGE_KEYS.CALCULATOR_KEY,CALCULATOR_KEY],[LEGACY_STORAGE_KEYS.ARCHIVE_KEY,ARCHIVE_KEY],
      [LEGACY_STORAGE_KEYS.ACTIVE_TAB_KEY,ACTIVE_TAB_KEY],[LEGACY_STORAGE_KEYS.CALCULATOR_DRAFT_KEY,CALCULATOR_DRAFT_KEY],[LEGACY_STORAGE_KEYS.SORT_KEY,SORT_KEY],
      [LEGACY_STORAGE_KEYS.SORT_SCHEMA_KEY,SORT_SCHEMA_KEY],[LEGACY_STORAGE_KEYS.RANDOM_SORT_SEED_KEY,RANDOM_SORT_SEED_KEY],[LEGACY_STORAGE_KEYS.CATEGORY_ORDER_KEY,CATEGORY_ORDER_KEY],
      [LEGACY_STORAGE_KEYS.CONSOLE_KEY,CONSOLE_KEY],[LEGACY_STORAGE_KEYS.EXPORT_VERSION_KEY,EXPORT_VERSION_KEY],[LEGACY_STORAGE_KEYS.DATABASE_UPDATED_KEY,DATABASE_UPDATED_KEY],
      [LEGACY_STORAGE_KEYS.EXPORT_FINGERPRINT_KEY,EXPORT_FINGERPRINT_KEY],[LEGACY_STORAGE_KEYS.DAILY_GOAL_KEY,DAILY_GOAL_KEY],[LEGACY_STORAGE_KEYS.LAST_EXPORT_KEY,LAST_EXPORT_KEY],
      [LEGACY_STORAGE_KEYS.LAST_IMPORT_KEY,LAST_IMPORT_KEY],[LEGACY_STORAGE_KEYS.UNDO_KEY,UNDO_KEY],[LEGACY_STORAGE_KEYS.STATS_TO_TODAY_KEY,STATS_TO_TODAY_KEY],[LEGACY_STORAGE_KEYS.SITE_DATA_VISIBLE_KEY,SITE_DATA_VISIBLE_KEY]
    ];
    beginStorageTransaction("Міграція старих локальних даних");
    pairs.forEach(([legacyKey,userKey])=>{if(localStorage.getItem(userKey)===null){const value=localStorage.getItem(legacyKey);if(value!==null)safeStorageSet(userKey,value,{critical:true});}});
    safeStorageSet(marker,"1",{critical:true});
    if(!finishStorageTransaction())console.warn("Legacy storage migration was rolled back safely.");
  }

  let products = [];
  let calculatorItems = [];
  let archiveItems = [];
  let selectedProduct = null;
  let editingProduct = null;
  let draggedCard = null;
  let reorderMode = false;
  let reorderChanged = false;
  let pendingProductOrder = null;
  let productOrderOriginal = null;
  let archiveEditingId = null;
  let archiveOriginalText = null;
  let archiveEditingButton = null;
  let archiveCompositionSourceButton = null;
  let archiveCommentEditingId = null;
  let archiveCommentOriginal = "";
  let archiveCommentEditingButton = null;
  let currentSort = "categories";
  const VALID_SORT_MODES=new Set(["categories","oldest","newest","list","random","initial","manual"]);
  let sortTarget = "blocks";
  let pendingCategoryOrder = null;
  let departmentsEnabled = true;
  let profileData = {display_name:"",full_name:"",birth_date:"",weight:"",height:"",avatar:""};
  let calculatorQuickPresets = [];
  let consoleItems = [];
  let draggedCalcIndex = null;
  let calculatorReorderMode = false;
  let calculatorReorderChanged = false;
  let dailyGoal = {enabled:false,kcal:0,protein:0,fat:0,carb:0,sugar:0,salt:0,fiber:0};
  let dailyGoalSettingsOpen = false;
  let pendingExport = null;
  let exportScope = "all";
  let pendingImport = null;
  let importScope = "all";

  const $ = id => document.getElementById(id);
  const tabs = document.querySelectorAll(".app > .tabs:not(.utilities-tabs) > .tab[data-tab]");
  const pages = document.querySelectorAll(".page");
  const utilitiesOpen = $("utilities-open"), utilitiesBack = $("utilities-back"), utilitiesTools = $("utilities-tools"), utilitiesConsole = $("utilities-console");
  let utilitiesReturnPage = "blocks";
  let utilitiesReturnScrollY = 0;

  const authScreen=$("auth-screen"), mainApp=$("main-app"), authTitle=$("auth-title"), authSubtitle=$("auth-subtitle"), authMessage=$("auth-message");
  const loginForm=$("login-form"), loginUsername=$("login-username"), loginPassword=$("login-password"), loginRemember=$("login-remember"), loginSubmit=$("login-submit"), showRegister=$("show-register"), showForgotPassword=$("show-forgot-password");
  const registerForm=$("register-form"), registerUsername=$("register-username"), registerPassword=$("register-password"), registerPasswordConfirm=$("register-password-confirm"), registerRemember=$("register-remember"), registerSubmit=$("register-submit"), showLogin=$("show-login");
  const forgotPasswordForm=$("forgot-password-form"), forgotPasswordSubmit=$("forgot-password-submit"), forgotPasswordBack=$("forgot-password-back"), recoveryRequestUsername=$("recovery-request-username"), recoveryContactTelegram=$("recovery-contact-telegram"), recoveryContactPhone=$("recovery-contact-phone");
  const passwordStrengthFill=$("password-strength-fill"), passwordStrengthText=$("password-strength-text"), passwordRuleElements=[...document.querySelectorAll("[data-password-rule]")];
  const adminRefresh=$("admin-refresh"), adminOpenUsers=$("admin-open-users"), adminCurrentUsername=$("admin-current-username"), adminUsersCount=$("admin-users-count"), adminAdminsCount=$("admin-admins-count"), adminMembersCount=$("admin-members-count"), adminStatus=$("admin-status"), adminOwnerNote=$("admin-owner-note"), adminUsersList=$("admin-users-list"), adminRecoveryCount=$("admin-recovery-count"), adminRecoveryStatus=$("admin-recovery-status"), adminRecoveryList=$("admin-recovery-list"), adminAuditCount=$("admin-audit-count"), adminAuditStatus=$("admin-audit-status"), adminAuditList=$("admin-audit-list");
  const adminTempPasswordModal=$("admin-temp-password-modal"), adminTempPasswordUser=$("admin-temp-password-user"), adminTempPasswordValue=$("admin-temp-password-value"), adminTempPasswordCopy=$("admin-temp-password-copy"), adminTempPasswordClose=$("admin-temp-password-close"), adminLoginsModal=$("admin-logins-modal"), adminLoginsUser=$("admin-logins-user"), adminLoginsList=$("admin-logins-list"), adminLoginsClose=$("admin-logins-close"), adminUsersModal=$("admin-users-modal"), adminUsersModalStatus=$("admin-users-modal-status"), adminUsersModalList=$("admin-users-modal-list"), adminUsersModalClose=$("admin-users-modal-close"), adminActionTypesModal=$("admin-action-types-modal"), adminActionTypesList=$("admin-action-types-list"), adminActionTypesClose=$("admin-action-types-close"), adminOpenActionTypes=$("admin-open-action-types"), adminFullModal=$("admin-full-modal"), adminFullUser=$("admin-full-user"), adminFullSummary=$("admin-full-summary"), adminFullStateSearch=$("admin-full-state-search"), adminFullStateSearchStatus=$("admin-full-state-search-status"), adminFullStateSearchResults=$("admin-full-state-search-results"), adminFullState=$("admin-full-state"), adminFullList=$("admin-full-list"), adminFullClose=$("admin-full-close"), logoutAccount=$("logout-account");
  const profileOpen=$("profile-open"), profileAvatarSmall=$("profile-avatar-small"), profileAvatarInitials=$("profile-avatar-initials"), profileDisplayName=$("profile-display-name");
  const profilePhotoButton=$("profile-photo-button"), profileAvatarLarge=$("profile-avatar-large"), profileAvatarLargeInitials=$("profile-avatar-large-initials"), profilePhotoChange=$("profile-photo-change"), profilePhotoRemove=$("profile-photo-remove"), profilePhotoInput=$("profile-photo-input");
  const profileDisplayInput=$("profile-display-input"), profileDisplayCount=$("profile-display-count"), profileFullName=$("profile-full-name"), profileBirthDate=$("profile-birth-date"), profileWeight=$("profile-weight"), profileHeight=$("profile-height"), profileSave=$("profile-save");
  const grid = $("grid");
  const searchInput = $("search");
  const clearSearch = $("clear-search");
  const exportButton = $("export-products");
  const importButton = $("import-products");
  const importFile = $("import-file");
  const addProductButton = $("add-product");
  const deleteProductButton = $("delete-product");
  const reorderProductsButton = $("reorder-products");
  const sortProductsButton = $("sort-products");

  const productModal = $("product-modal");
  const productModalName = $("product-modal-name");
  const productWeight = $("product-weight");
  const productQuickWeights = $("product-quick-weights");
  const productCancel = $("product-cancel");
  const productCopy = $("product-copy");
  const productCalculator = $("product-calculator");

  const addProductModal = $("add-product-modal");
  const addProductCancel = $("add-product-cancel");
  const addProductSave = $("add-product-save");
  const newProductName = $("new-product-name");
  const newProductKcal = $("new-product-kcal");
  const newProductKcalNoData = $("new-product-kcal-no-data");
  const newProductProtein = $("new-product-protein");
  const newProductProteinNoData = $("new-product-protein-no-data");
  const newProductFat = $("new-product-fat");
  const newProductFatNoData = $("new-product-fat-no-data");
  const newProductCarb = $("new-product-carb");
  const newProductCarbNoData = $("new-product-carb-no-data");
  const newProductSugar = $("new-product-sugar");
  const newProductSugarNoData = $("new-product-sugar-no-data");
  const newProductSalt = $("new-product-salt");
  const newProductSaltNoData = $("new-product-salt-no-data");
  const newProductFiber = $("new-product-fiber");
  const newProductFiberNoData = $("new-product-fiber-no-data");
  const newProductCategory = $("new-product-category");
  const newProductQuickWeights = [...document.querySelectorAll(".new-product-quick-weight")];
  const newProductDescription = $("new-product-description");
  const newProductDescriptionNoData = $("new-product-description-no-data");

  const editProductModal = $("edit-product-modal");
  const editProductCancel = $("edit-product-cancel");
  const editProductSave = $("edit-product-save");
  const editProductName = $("edit-product-name");
  const editProductKcal = $("edit-product-kcal");
  const editProductKcalNoData = $("edit-product-kcal-no-data");
  const editProductProtein = $("edit-product-protein");
  const editProductProteinNoData = $("edit-product-protein-no-data");
  const editProductFat = $("edit-product-fat");
  const editProductFatNoData = $("edit-product-fat-no-data");
  const editProductCarb = $("edit-product-carb");
  const editProductCarbNoData = $("edit-product-carb-no-data");
  const editProductSugar = $("edit-product-sugar");
  const editProductSugarNoData = $("edit-product-sugar-no-data");
  const editProductSalt = $("edit-product-salt");
  const editProductSaltNoData = $("edit-product-salt-no-data");
  const editProductFiber = $("edit-product-fiber");
  const editProductFiberNoData = $("edit-product-fiber-no-data");
  const editProductCategory = $("edit-product-category");
  const editProductQuickWeights = [...document.querySelectorAll(".edit-product-quick-weight")];
  const editProductDescription = $("edit-product-description");
  const editProductDescriptionNoData = $("edit-product-description-no-data");

  const productOrderModal = $("product-order-modal");
  const productOrderList = $("product-order-list");
  const productOrderReset = $("product-order-reset");
  const productOrderCancel = $("product-order-cancel");
  const productOrderSave = $("product-order-save");

  const sortProductsModal = $("sort-products-modal");
  const sortCategories = $("sort-categories");
  const sortDepartmentsToggle = $("sort-departments-toggle");
  const sortCategoryOrder = $("sort-category-order");
  const sortCustomCategory = $("sort-custom-category");
  const sortOldest = $("sort-oldest");
  const sortNewest = $("sort-newest");
  const sortList = $("sort-list");
  const sortRandom = $("sort-random");
  const sortInitial = $("sort-initial");
  const sortProductsCancel = $("sort-products-cancel");
  const categoryOrderModal = $("category-order-modal");
  const categoryOrderList = $("category-order-list");
  const categoryOrderReset = $("category-order-reset");
  const categoryOrderCancel = $("category-order-cancel");
  const categoryOrderSave = $("category-order-save");
  const customCategoryModal = $("custom-category-modal");
  const customCategoryName = $("custom-category-name");
  const customCategoryAdd = $("custom-category-add");
  const customCategoryList = $("custom-category-list");
  const customCategoryClose = $("custom-category-close");

  const deleteProductModal = $("delete-product-modal");
  const deleteProductList = $("delete-product-list");
  const deleteProductCancelTop = $("delete-product-cancel-top");
  const deleteProductCancelBottom = $("delete-product-cancel-bottom");
  const deleteSortProducts = $("delete-sort-products");

  const calcInput = $("calc-input");
  const calcAdd = $("calc-add");
  const calcClearText = $("calc-clear-text");
  const calcClearBlocks = $("calc-clear-blocks");
  const calcSection = $("calc-section");
  const calcQuickPresets = $("calc-quick-presets");
  const calcQuickManage = $("calc-quick-manage");
  const calcQuickModal = $("calc-quick-modal");
  const calcQuickMetric = $("calc-quick-metric");
  const calcQuickValue = $("calc-quick-value");
  const calcQuickAdd = $("calc-quick-add");
  const calcQuickList = $("calc-quick-list");
  const calcQuickClose = $("calc-quick-close");
  const kcalElement = $("kcal");
  const proteinElement = $("protein");
  const fatElement = $("fat");
  const carbElement = $("carb");
  const sugarElement = $("sugar");
  const saltElement = $("salt");
  const fiberElement = $("fiber");
  const copyTotal = $("copy-total");
  const saveArchive = $("save-archive");
  const reorderCalculatorHistory = $("reorder-calculator-history");
  const calcLog = $("calc-log");
  const archiveLog = $("archive-log");
  const archiveSearch = $("archive-search");
  const archiveSearchClear = $("archive-search-clear");
  const archiveSearchStatus = $("archive-search-status");
  const avgKcal7 = $("avg-kcal-7"), avgKcal14 = $("avg-kcal-14"), avgKcal30 = $("avg-kcal-30");
  const avgKcal7Note = $("avg-kcal-7-note"), avgKcal14Note = $("avg-kcal-14-note"), avgKcal30Note = $("avg-kcal-30-note");
  const siteProductsCount = $("site-products-count");
  const siteArchiveCount = $("site-archive-count");
  const siteDatabaseUpdated = $("site-database-updated");
  const siteCurrentDate = $("site-current-date");
  const siteLastExport = $("site-last-export");
  const siteLastImport = $("site-last-import");
  const siteDataToggle = $("site-data-toggle");
  const siteDataSection = $("archive-site-info");
  const siteDataContent = $("site-data-content");
  const dailyGoalToggle = $("daily-goal-toggle");
  const dailyGoalContent = $("daily-goal-content");
  const dailyGoalSettings = $("daily-goal-settings");
  const dailyGoalDetailsToggle = $("daily-goal-details-toggle");
  const dailyGoalCopyRemaining = $("daily-goal-copy-remaining");
  const dailyGoalSave = $("daily-goal-save");
  const goalInputs = {kcal:$("goal-kcal"),protein:$("goal-protein"),fat:$("goal-fat"),carb:$("goal-carb"),sugar:$("goal-sugar"),salt:$("goal-salt"),fiber:$("goal-fiber")};
  const remainElements = {kcal:$("remain-kcal"),protein:$("remain-protein"),fat:$("remain-fat"),carb:$("remain-carb"),sugar:$("remain-sugar"),salt:$("remain-salt"),fiber:$("remain-fiber")};
  const progressElements = {kcal:$("progress-kcal"),protein:$("progress-protein"),fat:$("progress-fat"),carb:$("progress-carb"),sugar:$("progress-sugar"),salt:$("progress-salt"),fiber:$("progress-fiber")};
  const progressLabels = {kcal:$("progress-label-kcal"),protein:$("progress-label-protein"),fat:$("progress-label-fat"),carb:$("progress-label-carb"),sugar:$("progress-label-sugar"),salt:$("progress-label-salt"),fiber:$("progress-label-fiber")};
  const exportPreviewModal = $("export-preview-modal");
  const exportPreviewProducts = $("export-preview-products");
  const exportPreviewArchive = $("export-preview-archive");
  const exportPreviewCalculator = $("export-preview-calculator");
  const exportPreviewDraft = $("export-preview-draft");
  const exportPreviewGoal = $("export-preview-goal");
  const exportPreviewSettings = $("export-preview-settings");
  const exportPreviewProfile = $("export-preview-profile");
  const exportPreviewVersion = $("export-preview-version");
  const exportPreviewDate = $("export-preview-date");
  const exportPreviewCancel = $("export-preview-cancel");
  const exportPreviewConfirm = $("export-preview-confirm");
  const exportScopeButtons = [...document.querySelectorAll("#export-scope-actions [data-scope]")];
  const importPreviewModal = $("import-preview-modal");
  const importPreviewProducts = $("import-preview-products");
  const importPreviewProductsDiff = $("import-preview-products-diff");
  const importPreviewArchive = $("import-preview-archive");
  const importPreviewArchiveDiff = $("import-preview-archive-diff");
  const importPreviewCalculator = $("import-preview-calculator");
  const importPreviewDraft = $("import-preview-draft");
  const importPreviewGoal = $("import-preview-goal");
  const importPreviewSettings = $("import-preview-settings");
  const importPreviewProfile = $("import-preview-profile");
  const importPreviewVersion = $("import-preview-version");
  const importPreviewDate = $("import-preview-date");
  const importPreviewCancel = $("import-preview-cancel");
  const importPreviewConfirm = $("import-preview-confirm");
  const importScopeButtons = [...document.querySelectorAll("#import-scope-actions [data-scope]")];
  const clearSiteButton = $("clear-site");
  const deleteAccountButton = $("delete-account");
  const undoLastAction = $("undo-last-action");
  const refreshSiteButton = $("refresh-site");
  const consoleLog = $("console-log");
  const systemStatusRefresh = $("system-status-refresh");
  const systemVersion = $("system-version"), systemNetwork = $("system-network"), systemWorker = $("system-worker"), systemStorage = $("system-storage"), systemStorageCard = $("system-storage-card"), systemStorageNote = $("system-storage-note"), systemUndo = $("system-undo"), systemSync = $("system-sync"), systemSyncTime = $("system-sync-time"), systemExport = $("system-export"), systemImport = $("system-import"), systemSyncNote = $("system-sync-note");
  const syncNowButton = $("sync-now"), syncUseServer = $("sync-use-server"), syncUseLocal = $("sync-use-local");
  const statsChart = $("stats-chart");
  const statsEmpty = $("stats-empty");
  const statsTooltip = $("stats-tooltip");
  const statsMonthSummary = $("stats-month-summary");
  let statsRenderedPoints = [];
  let statsChartGeometry = null;
  const statsFrom = $("stats-from");
  const statsTo = $("stats-to");
  const statsToToday = $("stats-to-today");
  let statsToTodayEnabled = false;
  let lastValidStatsFrom = "";
  let lastValidStatsTo = "";
  let siteDataVisible = true;
  const statsMetricButtons = document.querySelectorAll(".stats-metric");
  let statsMetric = "kcal";

  const archiveTextModal = $("archive-text-modal");
  const archiveTextInput = $("archive-text-input");
  const archiveTextCancel = $("archive-text-cancel");
  const archiveTextSave = $("archive-text-save");
  const archiveCommentModal = $("archive-comment-modal");
  const archiveCommentInput = $("archive-comment-input");
  const archiveCommentLimit = $("archive-comment-limit");
  const archiveCommentCancel = $("archive-comment-cancel");
  const archiveCommentSave = $("archive-comment-save");
  const archiveCompositionModal = $("archive-composition-modal");
  const archiveCompositionDate = $("archive-composition-date");
  const archiveCompositionList = $("archive-composition-list");
  const archiveCompositionClose = $("archive-composition-close");

  const statusStyle = document.createElement("style");
  statusStyle.textContent = `
    .button-status-success,.button-status-success:hover{background:#22c55e!important;color:#fff!important;box-shadow:0 0 0 1px rgba(34,197,94,.30),0 0 18px rgba(34,197,94,.30)!important}
    .button-status-error,.button-status-error:hover{background:#ef4444!important;color:#fff!important;box-shadow:0 0 0 1px rgba(239,68,68,.30),0 0 18px rgba(239,68,68,.30)!important}
    .button-status-info,.button-status-info:hover{background:#7289da!important;color:#fff!important;box-shadow:0 0 0 1px rgba(114,137,218,.30),0 0 18px rgba(114,137,218,.30)!important}
    .button-status-success::after,.button-status-error::after{display:inline-block;margin-left:7px;font-weight:800;animation:buttonStatusIconIn .36s cubic-bezier(.16,1,.3,1) both}
    .button-status-success::after{content:"✓"}
    .button-status-error::after{content:"✕"}
    .button-status-entering{animation:buttonStatusIn .40s cubic-bezier(.16,1,.3,1) both}
    .button-status-leaving{animation:buttonStatusOut .25s cubic-bezier(.4,0,.2,1) both}
    @keyframes buttonStatusIn{
      0%{transform:scale(.988);filter:brightness(.94);opacity:.96}
      58%{transform:scale(1.006);filter:brightness(1.025);opacity:1}
      100%{transform:scale(1);filter:brightness(1);opacity:1}
    }
    @keyframes buttonStatusOut{
      0%{transform:scale(1);filter:brightness(1);opacity:1}
      100%{transform:scale(.994);filter:brightness(.98);opacity:.97}
    }
    @keyframes buttonStatusIconIn{
      0%{opacity:0;transform:translateX(-3px) scale(.86)}
      100%{opacity:1;transform:translateX(0) scale(1)}
    }
  `;
  document.head.appendChild(statusStyle);


  class AuthApiError extends Error{constructor(status,message){super(message);this.status=status;}}

  function repairLegacyMessage(value) {
    if (typeof value !== "string") return value;
    const score = text => (text.match(/[\u0420\u0421][\u0080-\u04ff\u2000-\u2122]/g) || []).length;
    if (score(value) < 3) return value;
    const cp1251 = "\u0402\u0403\u201a\u0453\u201e\u2026\u2020\u2021\u20ac\u2030\u0409\u2039\u040a\u040c\u040b\u040f\u0452\u2018\u2019\u201c\u201d\u2022\u2013\u2014\u0098\u2122\u0459\u203a\u045a\u045c\u045b\u045f\u00a0\u040e\u045e\u0408\u00a4\u0490\u00a6\u00a7\u0401\u00a9\u0404\u00ab\u00ac\u00ad\u00ae\u0407\u00b0\u00b1\u0406\u0456\u0491\u00b5\u00b6\u00b7\u0451\u2116\u0454\u00bb\u0458\u0405\u0455\u0457\u0410\u0411\u0412\u0413\u0414\u0415\u0416\u0417\u0418\u0419\u041a\u041b\u041c\u041d\u041e\u041f\u0420\u0421\u0422\u0423\u0424\u0425\u0426\u0427\u0428\u0429\u042a\u042b\u042c\u042d\u042e\u042f\u0430\u0431\u0432\u0433\u0434\u0435\u0436\u0437\u0438\u0439\u043a\u043b\u043c\u043d\u043e\u043f\u0440\u0441\u0442\u0443\u0444\u0445\u0446\u0447\u0448\u0449\u044a\u044b\u044c\u044d\u044e\u044f";
    const lookup = new Map(Array.from(cp1251, (char, index) => [char, index + 128]));
    const toByte = char => char.charCodeAt(0) < 128 ? char.charCodeAt(0) : lookup.get(char);
    const decoder = new TextDecoder("utf-8", {fatal: true});
    let text = value;
    for (let pass = 0; pass < 2 && score(text) >= 3; pass++) {
      // Prefer a complete reversible conversion; this also repairs one-letter words.
      const wholeBytes = Array.from(text, toByte);
      if (wholeBytes.every(byte => byte !== undefined)) {
        try {
          const candidate = decoder.decode(Uint8Array.from(wholeBytes));
          if (score(candidate) < score(text)) { text = candidate; continue; }
        } catch (_) { /* Mixed healthy names are handled by the conservative run fallback. */ }
      }
      // Only reverse valid UTF-8 byte sequences; healthy text and unknown characters stay untouched.
      const repaired = text.replace(/[^\u0000-\u007f]+/gu, run => {
        let result = "", chunk = "", bytes = [];
        const flush = () => {
          if (!chunk) return;
          try {
            const candidate = decoder.decode(Uint8Array.from(bytes));
            result += (score(chunk) >= 2 || /[\u0420\u0421][^\u0400-\u04ff]/.test(chunk)) && score(candidate) < score(chunk) ? candidate : chunk;
          } catch (_) { result += chunk; }
          chunk = ""; bytes = [];
        };
        for (let i = 0; i < run.length;) {
          const lead = toByte(run[i]);
          const size = lead >= 0xc2 && lead <= 0xdf ? 2 : lead >= 0xe0 && lead <= 0xef ? 3 : lead >= 0xf0 && lead <= 0xf4 ? 4 : 0;
          const part = size ? Array.from(run.slice(i, i + size), toByte) : [];
          if (part.length === size && size && part.slice(1).every(byte => byte >= 0x80 && byte <= 0xbf)) {
            chunk += run.slice(i, i + size); bytes.push(...part); i += size;
          } else { flush(); result += run[i++]; }
        }
        flush(); return result;
      });
      if (repaired === text) break;
      text = repaired;
    }
    return text;
  }

  function setAuthMessage(message="",type=""){
    if(!authMessage)return;
    authMessage.textContent=message;
    authMessage.className=`auth-message${type?` ${type}`:""}`;
  }

  function switchAuthMode(mode){
    const current=["login","register","forgot"].includes(mode)?mode:"login";
    if(loginForm)loginForm.hidden=current!=="login";
    if(registerForm)registerForm.hidden=current!=="register";
    if(forgotPasswordForm)forgotPasswordForm.hidden=current!=="forgot";
    const titles={login:"Вхід у КБЖВ",register:"Реєстрація у КБЖВ",forgot:"Відновлення пароля"};
    const subtitles={
      login:"Увійдіть у свій акаунт, щоб продовжити.",
      register:"Створіть власний акаунт. Для реєстрації потрібні логін і пароль.",
      forgot:"Надішліть запит власнику сайту для відновлення доступу та зв’яжіться з ним напряму.",
    };
    if(authTitle)authTitle.textContent=titles[current];
    if(authSubtitle)authSubtitle.textContent=subtitles[current];
    setAuthMessage("");
  }

  function getStoredAuthSession(){
    const sources=[{storage:localStorage,key:AUTH_LOCAL_KEY,remembered:true},{storage:sessionStorage,key:AUTH_SESSION_KEY,remembered:false}];
    for(const source of sources){
      let raw=null;
      try{raw=JSON.parse(source.storage.getItem(source.key)||"null");}catch(_){source.storage.removeItem(source.key);continue;}
      if(!raw)continue;
      if(!raw.token||!raw.user){source.storage.removeItem(source.key);continue;}
      if(raw.expires_at&&Date.parse(raw.expires_at)<=Date.now()){source.storage.removeItem(source.key);continue;}
      return {...raw,remembered:source.remembered};
    }
    return null;
  }

  function persistAuthSession(session,remembered){
    const payload=JSON.stringify({token:session.token,expires_at:session.expires_at,user:session.user});
    try{
      if(remembered){localStorage.setItem(AUTH_LOCAL_KEY,payload);sessionStorage.removeItem(AUTH_SESSION_KEY);}
      else{sessionStorage.setItem(AUTH_SESSION_KEY,payload);localStorage.removeItem(AUTH_LOCAL_KEY);}
    }catch(_){
      // Якщо постійне сховище недоступне/заповнене, сесію не втрачаємо: зберігаємо до закриття вкладки.
      sessionStorage.setItem(AUTH_SESSION_KEY,payload);
      try{localStorage.removeItem(AUTH_LOCAL_KEY);}catch(_2){}
      authRemembered=false;
    }
  }

  function updateStoredAuthUser(user){
    const storage=authRemembered?localStorage:sessionStorage, key=authRemembered?AUTH_LOCAL_KEY:AUTH_SESSION_KEY;
    try{const raw=JSON.parse(storage.getItem(key)||"null");if(raw&&raw.token){raw.user=user;storage.setItem(key,JSON.stringify(raw));}}catch(_){}
  }

  function clearAuthSession(){
    localStorage.removeItem(AUTH_LOCAL_KEY);sessionStorage.removeItem(AUTH_SESSION_KEY);authToken="";authUser=null;authRemembered=false;
  }

  async function authApi(path,{method="GET",body,token=authToken}={}){
    const headers={};
    if(body!==undefined)headers["Content-Type"]="application/json";
    if(token)headers.Authorization=`Bearer ${token}`;
    let response;
    try{response=await fetch(`${AUTH_API_URL}${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body),cache:"no-store"});}
    catch(error){const networkError=new AuthApiError(0,"Немає з’єднання із сервером.");networkError.cause=error;throw networkError;}
    let data={};try{data=await response.json();}catch(_){}
    const repairMessages=value=>{
      if(!value||typeof value!=="object")return;
      for(const [key,item] of Object.entries(value)){
        if((key==="message"||key==="error")&&typeof item==="string")value[key]=repairLegacyMessage(item);
        else if(item&&typeof item==="object")repairMessages(item);
      }
    };
    repairMessages(data);
    if(!response.ok)throw new AuthApiError(response.status,data?.error||`Помилка сервера (${response.status}).`);
    return data;
  }



  function normalizeTelegramContact(value){
    const raw=String(value||"").trim();
    if(!raw)return {label:"",href:""};
    if(/^https?:\/\//i.test(raw))return {label:raw.replace(/^https?:\/\/(?:www\.)?t\.me\//i,"@"),href:raw};
    const username=raw.replace(/^@/,"");
    return {label:`@${username}`,href:`https://t.me/${encodeURIComponent(username)}`};
  }

  async function loadPublicRecoveryContact(){
    try{
      const data=await authApi("/public/recovery-contact",{token:""});
      const telegram=normalizeTelegramContact(data?.telegram);
      const phone=String(data?.phone||"").trim();
      if(recoveryContactTelegram){
        recoveryContactTelegram.hidden=!telegram.href;
        if(telegram.href){recoveryContactTelegram.href=telegram.href;recoveryContactTelegram.textContent=`Telegram: ${telegram.label}`;}
      }
      if(recoveryContactPhone){
        recoveryContactPhone.hidden=!phone;
        if(phone){recoveryContactPhone.href=`tel:${phone.replace(/[^+\d]/g,"")}`;recoveryContactPhone.textContent=`Телефон: ${phone}`;}
      }
    }catch(error){
      console.warn("Recovery contact load failed:",error);
      if(recoveryContactTelegram)recoveryContactTelegram.hidden=true;
      if(recoveryContactPhone)recoveryContactPhone.hidden=true;
    }
  }







  function passwordRules(value){
    const password=String(value||"");
    return {length:password.length>=11,upper:/\p{Lu}/u.test(password),lower:/\p{Ll}/u.test(password),number:/\p{N}/u.test(password),special:/[\p{P}\p{S}]/u.test(password)};
  }

  function renderPasswordStrength(){
    if(!registerPassword)return;
    const value=registerPassword.value,rules=passwordRules(value),score=Object.values(rules).filter(Boolean).length;
    passwordRuleElements.forEach(element=>element.classList.toggle("valid",!!rules[element.dataset.passwordRule]));
    if(!value){passwordStrengthFill.style.width="0";passwordStrengthFill.style.backgroundColor="";passwordStrengthText.textContent="Пароль ще не введено";return;}
    passwordStrengthFill.style.width=`${Math.max(12,score*20)}%`;
    if(score<=2){passwordStrengthFill.style.backgroundColor="#ef4444";passwordStrengthText.textContent="Слабкий пароль";}
    else if(score<5){passwordStrengthFill.style.backgroundColor="#f59e0b";passwordStrengthText.textContent="Середній пароль";}
    else{passwordStrengthFill.style.backgroundColor="#22c55e";passwordStrengthText.textContent="Надійний пароль";}
  }

  function validateRegistrationPassword(password){
    const rules=passwordRules(password);
    if(password.length>128)return "Пароль не може містити більше 128 символів.";
    if(!rules.length)return "Пароль повинен містити мінімум 11 символів.";
    if(!rules.upper)return "Додайте хоча б одну велику літеру.";
    if(!rules.lower)return "Додайте хоча б одну малу літеру.";
    if(!rules.number)return "Додайте хоча б одну цифру.";
    if(!rules.special)return "Додайте хоча б один спеціальний символ.";
    return "";
  }

  function formatAdminDate(value){
    if(!value)return "—";const date=new Date(value);if(Number.isNaN(date.getTime()))return String(value);
    return date.toLocaleString("uk-UA",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"});
  }

  function normalizeProfile(value){
    const source=value&&typeof value==="object"?value:{};
    return {
      display_name:String(source.display_name||"").trim().slice(0,20),
      full_name:String(source.full_name||"").trim().slice(0,120),
      birth_date:String(source.birth_date||"").trim().slice(0,10),
      weight:String(source.weight??"").trim().slice(0,20),
      height:String(source.height??"").trim().slice(0,20),
      avatar:String(source.avatar||"").startsWith("data:image/")?String(source.avatar):""
    };
  }
  // Reject import-only profile fields that normalizeProfile would silently truncate.
  // Legacy missing/null fields are accepted; ordinary user form limits are unchanged.
  function validateImportedProfile(value){
    if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("Пошкоджено профіль у резервній копії.");
    for(const [key,max] of Object.entries({display_name:20,full_name:120,birth_date:10,weight:20,height:20})){
      const field=value[key];
      if(field===undefined||field===null)continue;
      if(typeof field!=="string"||field.trim().length>max)
        throw new Error(`Некоректне або надто довге поле профілю «${key}». Дані не змінено.`);
    }
    if(value.avatar!==undefined&&value.avatar!==null&&
       (typeof value.avatar!=="string"||(value.avatar!==""&&!value.avatar.startsWith("data:image/"))))
      throw new Error("Некоректне зображення профілю в резервній копії.");
    return true;
  }
  function hasProfileData(value=profileData){
    const p=normalizeProfile(value);
    return Boolean(p.display_name||p.full_name||p.birth_date||p.weight||p.height||p.avatar);
  }

  const QUICK_METRICS=new Set(["kcal","protein","fat","carb","sugar","salt","fiber"]);
  const QUICK_METRIC_LABELS={
    kcal:"ккал",
    protein:"білка",
    fat:"жирів",
    carb:"вуглеводів",
    sugar:"цукрів",
    salt:"солі",
    fiber:"клітковини"
  };
  function normalizeQuickPreset(value,index=0){
    if(!value||typeof value!=="object")return null;
    const metric=String(value.metric||"").trim();
    const amount=calculatorNumber(value.amount);
    if(!QUICK_METRICS.has(metric)||!(amount>0))return null;
    return {
      id:String(value.id||`quick-${index}-${metric}-${amount}`),
      metric,
      amount:Math.round((amount+Number.EPSILON)*1000)/1000
    };
  }
  function normalizeQuickPresets(values){
    const seen=new Set();
    return (Array.isArray(values)?values:[]).map(normalizeQuickPreset).filter(Boolean).filter(item=>{
      const key=`${item.metric}|${item.amount}`;
      if(seen.has(key))return false;
      seen.add(key);
      return true;
    });
  }
  function loadCalculatorQuickPresets(){
    try{calculatorQuickPresets=normalizeQuickPresets(JSON.parse(localStorage.getItem(CALC_QUICK_PRESETS_KEY)||"[]"));}
    catch(_){calculatorQuickPresets=[];}
    renderCalculatorQuickPresets();
  }
  function saveCalculatorQuickPresets(){
    const next=normalizeQuickPresets(calculatorQuickPresets);
    if(!persistUserChange("Збереження швидких КБЖВ",()=>safeStorageSet(CALC_QUICK_PRESETS_KEY,JSON.stringify(next),{critical:true}))){
      if(!storageTransaction)loadCalculatorQuickPresets();
      return false;
    }
    calculatorQuickPresets=next;
    renderCalculatorQuickPresets();
    return true;
  }
  function quickPresetLabel(item){
    return `+${formatNumber(item.amount)} ${QUICK_METRIC_LABELS[item.metric]||item.metric}`;
  }

  function getProfileDisplayName(){
    return profileData.display_name||authUser?.username||"Користувач";
  }

  function profileInitials(){
    const source=getProfileDisplayName();
    const parts=String(source||"").trim().split(/\s+/).filter(Boolean);
    if(!parts.length)return "?";
    return (parts.length===1?parts[0].slice(0,2):(parts[0][0]+parts[1][0])).toUpperCase();
  }

  function renderProfile(){
    const displayName=getProfileDisplayName();
    const initials=profileInitials();
    const hasAvatar=!!profileData.avatar;

    if(profileDisplayName){
      profileDisplayName.textContent=displayName;
      const isAdmin=authUser?.role==="admin";
      profileDisplayName.disabled=!isAdmin;
      profileDisplayName.classList.toggle("admin-link",isAdmin);
      profileDisplayName.title=isAdmin?"Відкрити панель адміністратора":"";
    }

    [[profileAvatarSmall,profileAvatarInitials],[profileAvatarLarge,profileAvatarLargeInitials]].forEach(([imageEl,initialEl])=>{
      if(imageEl){
        if(hasAvatar){imageEl.src=profileData.avatar;imageEl.hidden=false;}
        else{imageEl.removeAttribute("src");imageEl.hidden=true;}
      }
      if(initialEl){initialEl.textContent=initials;initialEl.hidden=hasAvatar;}
    });

    if(profileDisplayInput)profileDisplayInput.value=profileData.display_name;
    if(profileDisplayCount)profileDisplayCount.textContent=String(profileData.display_name.length);
    if(profileFullName)profileFullName.value=profileData.full_name;
    if(profileBirthDate)profileBirthDate.value=profileData.birth_date;
    if(profileWeight)profileWeight.value=profileData.weight;
    if(profileHeight)profileHeight.value=profileData.height;
    if(profilePhotoRemove)profilePhotoRemove.disabled=!hasAvatar;
  }

  function loadProfile(){
    try{profileData=normalizeProfile(JSON.parse(localStorage.getItem(PROFILE_KEY)||"{}"));}
    catch(_){profileData=normalizeProfile({});}
    renderProfile();
  }

  function saveProfileLocal(){
    if(!persistUserChange("Збереження профілю",()=>safeStorageSet(PROFILE_KEY,JSON.stringify(profileData),{critical:true}))){loadProfile();return false;}
    renderProfile();return true;
  }

  function collectProfileForm(avatar=profileData.avatar){
    return normalizeProfile({
      avatar,
      display_name:profileDisplayInput?.value??profileData.display_name,
      full_name:profileFullName?.value??profileData.full_name,
      birth_date:profileBirthDate?.value??profileData.birth_date,
      weight:profileWeight?.value??profileData.weight,
      height:profileHeight?.value??profileData.height
    });
  }

  async function resizeProfileImage(file){
    if(!file||!String(file.type||"").startsWith("image/"))throw new Error("Оберіть зображення.");
    const url=URL.createObjectURL(file);
    try{
      const image=new Image();
      image.decoding="async";
      await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error("Не вдалося прочитати фото."));image.src=url;});
      const side=Math.min(image.naturalWidth||image.width,image.naturalHeight||image.height);
      const sx=Math.max(0,((image.naturalWidth||image.width)-side)/2);
      const sy=Math.max(0,((image.naturalHeight||image.height)-side)/2);
      const canvas=document.createElement("canvas");
      canvas.width=384;canvas.height=384;
      const context=canvas.getContext("2d");
      if(!context)throw new Error("Не вдалося обробити фото.");
      context.drawImage(image,sx,sy,side,side,0,0,384,384);
      return canvas.toDataURL("image/jpeg",0.82);
    }finally{URL.revokeObjectURL(url);}
  }

  function fitTopTabLabels(){
    const nodes=[...document.querySelectorAll(".app > .tabs:not(.utilities-tabs) .tab-label-sub,.app > .tabs:not(.utilities-tabs) .tab-label-single")];

    nodes.forEach(node=>{
      node.style.removeProperty("font-size");
      const available=node.clientWidth;
      if(!available)return;

      let size=parseFloat(getComputedStyle(node).fontSize)||11.5;
      const isCalculator=!!node.closest('.tab[data-tab="calculator"]');
      const minSize=isCalculator?10.4:10.8;

      node.style.setProperty("font-size",`${size}px`,"important");

      let guard=0;
      while(node.scrollWidth>node.clientWidth+0.5&&size>minSize&&guard<20){
        size=Math.max(minSize,size-0.15);
        node.style.setProperty("font-size",`${size}px`,"important");
        guard++;
      }
    });
  }

  function scheduleTopTabFit(){
    requestAnimationFrame(()=>{
      requestAnimationFrame(fitTopTabLabels);
    });
    setTimeout(fitTopTabLabels,120);
  }

  function isAdminUser(user=authUser){return user?.role==="admin";}
  function roleLabel(user){
    if(user?.is_owner)return "Головний адміністратор";
    return user?.role==="admin"?"Адміністратор":"Учасник";
  }

  function activateAppPage(target,{label="",save=true}={}){
    if(target==="admin"&&!isAdminUser())return;
    // «Консоль» у «Зручностях» — окреме представлення тієї самої
    // функціональної сторінки та журналу. Жодних дублікатів DOM/БД.
    const wasUtilities=!!mainApp?.classList.contains("utilities-mode");
    const isUtilityConsole=target==="utilities-console";
    const isUtilities=target==="utilities"||isUtilityConsole;
    const pageId=isUtilityConsole?"console":target;
    // При перемиканні інструменти <-> консоль не очищаємо форми.
    // Очищення відбувається лише після виходу з усього розділу.
    if(wasUtilities&&!isUtilities)window.dispatchEvent(new Event("utilities:reset"));
    mainApp?.classList.toggle("utilities-mode",isUtilities);
    mainApp?.classList.toggle("utilities-console-view",isUtilityConsole);
    // Як у головних вкладках: активна рівно одна кнопка другої сторінки.
    utilitiesTools?.classList.toggle("active",isUtilities&&!isUtilityConsole);
    utilitiesTools?.setAttribute("aria-pressed",String(isUtilities&&!isUtilityConsole));
    utilitiesConsole?.classList.toggle("active",isUtilityConsole);
    utilitiesConsole?.setAttribute("aria-pressed",String(isUtilityConsole));
    tabs.forEach(tab=>tab.classList.remove("active"));
    pages.forEach(page=>page.classList.remove("active"));
    if(!isUtilities)document.querySelector(`.tab[data-tab="${pageId}"]`)?.classList.add("active");
    $(pageId)?.classList.add("active");
    if(isUtilities&&!wasUtilities)window.dispatchEvent(new Event("utilities:open"));
    if(save&&!isUtilities)safeStorageSet(ACTIVE_TAB_KEY,pageId);
    if(label&&!isUtilities&&!wasUtilities)logAction(`Відкрито вкладку «${label}».`);
    if(pageId==="archive"){renderArchive();requestAnimationFrame(()=>renderStatistics());}
    if(pageId==="calculator"){renderCalculatorLog();updateTotals();}
    if(pageId==="console"){renderConsole();renderSystemStatus();}
    if(target==="profile"){renderProfile();}
    if(target==="admin"&&isAdminUser())loadAdminUsers(false);
  }

  function showAuthenticatedApp(user,{offline=false}={}){
    authUser=user;applyUserStorageNamespace(user.id);migrateLegacyDataToAdmin(user);
    if(adminCurrentUsername)adminCurrentUsername.textContent=user.username||"—";
    if(adminOwnerNote)adminOwnerNote.hidden=!user.is_owner;
    loadProfile();
    
    document.body.classList.remove("auth-active");
    if(authScreen)authScreen.hidden=true;if(mainApp)mainApp.hidden=false;
    scheduleTopTabFit();
    if(!appInitialized)initializeAuthenticatedApp();
    if(isAdminUser(user)&&!offline)loadAdminUsers(false);
    scheduleAdminStateSync(250);
    recordSiteVisit();
    if(!offline)setTimeout(()=>void flushAuditQueue(),0);
  }

  async function completeAuthentication(session,remembered){
    authToken=session.token;authUser=session.user;authRemembered=!!remembered;persistAuthSession(session,authRemembered);showAuthenticatedApp(session.user);
  }

  async function bootstrapAuthentication(){
    document.body.classList.add("auth-active");
    switchAuthMode("login");
    const saved=getStoredAuthSession();
    if(!saved){authScreen.hidden=false;mainApp.hidden=true;return;}
    authToken=saved.token;authUser=saved.user;authRemembered=!!saved.remembered;setAuthMessage("Перевірка сесії...","info");
    try{const data=await authApi("/auth/me");authUser=data.user;updateStoredAuthUser(data.user);setAuthMessage("");showAuthenticatedApp(data.user);}
    catch(error){
      if(error?.status===0&&saved.user){setAuthMessage("");showAuthenticatedApp(saved.user,{offline:true});return;}
      clearAuthSession();authScreen.hidden=false;mainApp.hidden=true;setAuthMessage(error?.message||"Увійдіть знову.","error");
    }
  }

  async function performLogout(){
    const token=authToken;clearAuthSession();if(token){try{await authApi("/auth/logout",{method:"POST",token});}catch(_){}}location.reload();
  }

  const ADMIN_AUDIT_LABELS={
    account_created:"Реєстрація",
    login:"Вхід через логін і пароль",
    visit:"Відвідування сайту",
    logout:"Вихід",
    account_deleted:"Видалення акаунта",
    role_changed:"Зміна ролі",
    site_action:"Серверна / історична дія",
    client_action:"Дія (зі слів браузера)"
  };

  const ADMIN_AUDIT_DESCRIPTIONS={
    account_created:"Створення нового акаунта користувача.",
    login:"Успішна авторизація з введенням логіна та пароля.",
    visit:"Фактичне відкриття або повернення на сайт із чинною сесією без обов’язкового повторного введення пароля.",
    logout:"Вихід користувача зі свого акаунта.",
    account_deleted:"Самостійне видалення користувачем свого акаунта.",
    role_changed:"Надання або зняття прав адміністратора головним адміністратором.",
    site_action:"Дія, записана сервером або перенесена зі старого журналу. Старі записи могли надходити від браузера.",
    client_action:"Повідомлення браузера про дію. Сам факт виконання не підтверджений сервером."
  };

  let adminUsersCache=[];
  let adminRecoveryCache=[];
  let adminFullStateSnapshot=null;

  function isVisibleAdminAuditEvent(event){
    const type=String(event?.event_type||"");
    if(["account_created","login","logout","account_deleted","role_changed"].includes(type))return true;
    return ["site_action","client_action"].includes(type)&&isClearSiteAuditMessage(event?.message);
  }

  function latestCriticalAction(user){
    const candidates=[
      [user?.last_logout_at,"Вихід"],
      [user?.last_clear_at,"Заявлене очищення сайту"]
    ].filter(([time])=>time&&Number.isFinite(Date.parse(time)));
    if(!candidates.length)return {label:"—",time:null};
    candidates.sort((a,b)=>Date.parse(b[0])-Date.parse(a[0]));
    return {label:candidates[0][1],time:candidates[0][0]};
  }

  async function fetchAllAdminCoreAudit(){
    let beforeId=null;
    const seenCursors=new Set();
    const events=[];
    while(true){
      const params=new URLSearchParams({scope:"core",limit:"1000"});
      if(beforeId)params.set("before_id",String(beforeId));
      const data=await authApi(`/admin/audit?${params.toString()}`);
      if(Array.isArray(data.events))events.push(...data.events);
      beforeId=Number(data.next_before_id)||null;
      if(!beforeId||seenCursors.has(beforeId))break;
      seenCursors.add(beforeId);
    }
    return {events,truncated:false};
  }

  async function loadAdminAudit(){
    if(!isAdminUser()||!adminAuditList)return;
    if(adminAuditStatus)adminAuditStatus.textContent="Завантаження історії активності...";
    const data=await fetchAllAdminCoreAudit();
    const rawEvents=Array.isArray(data.events)?data.events:[];
    const events=rawEvents.filter(isVisibleAdminAuditEvent);
    adminAuditList.innerHTML="";
    if(adminAuditCount)adminAuditCount.textContent=String(events.length);
    if(adminAuditStatus)adminAuditStatus.textContent=events.length?"Показано всі основні події акаунтів.":"Історія активності порожня.";
    if(!events.length)return;

    events.forEach(event=>{
      const row=document.createElement("div");
      row.className=`admin-audit-row ${event.event_type==="account_deleted"?"deleted":""}`;
      const who=document.createElement("div");who.className="admin-audit-who";
      const whoStrong=document.createElement("strong");whoStrong.textContent=event.username||"—";
      const whoMeta=document.createElement("span");whoMeta.textContent=`ID: ${String(event.user_id??"—")}`;who.append(whoStrong,whoMeta);
      const badge=document.createElement("span");badge.className=`admin-audit-badge ${event.event_type==="account_deleted"?"deleted":""}`;badge.textContent=ADMIN_AUDIT_LABELS[event.event_type]||"Подія";
      const time=document.createElement("div");time.className="admin-audit-time";time.textContent=formatAdminDate(event.created_at);
      const message=document.createElement("div");message.className="admin-audit-message";message.textContent=event.message||"—";
      row.append(who,badge,time,message);adminAuditList.append(row);
    });
  }

  function makeAdminInfoCell(title,value,wide=false){
    const cell=document.createElement("div");cell.className=`admin-user-cell${wide?" admin-wide":""}`;
    const strong=document.createElement("strong");strong.textContent=title;cell.append(strong,document.createTextNode(value||"—"));return cell;
  }

  async function changeAdminRole(user,nextRole,button){
    if(!authUser?.is_owner)return;
    const nextLabel=nextRole==="admin"?"адміністратора":"учасника";
    if(!confirm(`Змінити роль «${user.username}» на ${nextLabel}?`))return;
    button.disabled=true;
    try{
      await authApi(`/admin/users/${encodeURIComponent(user.id)}/role`,{method:"PATCH",body:{role:nextRole}});
      showButtonState(button,nextRole==="admin"?"Права надано":"Права знято","success",1000);
      await loadAdminUsers(false);
    }catch(error){
      button.disabled=false;showButtonState(button,"Помилка","error");alert(error?.message||"Не вдалося змінити роль.");
    }
  }

  // v91/8321: masked confirmation code for deleting another user account.
  function requestOwnerDeleteCode(username){
    return new Promise(resolve=>{
      const modal=$("owner-password-modal"),input=$("owner-password-input");
      const confirmButton=$("owner-password-confirm"),cancelButton=$("owner-password-cancel");
      const target=$("owner-password-target");
      if(!modal||!input||!confirmButton||!cancelButton){resolve(null);return;}
      if(target)target.textContent=`Видалення акаунта «${username}»`;
      input.value="";
      let completed=false;
      const close=value=>{
        if(completed)return;
        completed=true;
        modal.classList.remove("active");
        if(!document.querySelector(".product-modal.active"))document.body.classList.remove("edit-modal-open");
        confirmButton.removeEventListener("click",handleConfirm);
        cancelButton.removeEventListener("click",handleCancel);
        modal.removeEventListener("click",handleBackdrop);
        input.removeEventListener("keydown",handleKey);
        document.removeEventListener("keydown",handleEscape,true);
        input.value="";
        resolve(value);
      };
      const handleConfirm=()=>close(input.value||null);
      const handleCancel=()=>close(null);
      const handleBackdrop=event=>{if(event.target===modal)handleCancel();};
      const handleKey=event=>{if(event.key==="Enter"){event.preventDefault();handleConfirm();}};
      const handleEscape=event=>{if(event.key==="Escape"&&modal.classList.contains("active")){event.preventDefault();event.stopImmediatePropagation();handleCancel();}};
      confirmButton.addEventListener("click",handleConfirm);
      cancelButton.addEventListener("click",handleCancel);
      modal.addEventListener("click",handleBackdrop);
      input.addEventListener("keydown",handleKey);
      document.addEventListener("keydown",handleEscape,true);
      modal.classList.add("active");document.body.classList.add("edit-modal-open");
      setTimeout(()=>input.focus(),60);
    });
  }

  async function deleteAdminUser(user,button){
    if(!authUser?.is_owner||!user||user.is_owner)return;
    const username=String(user.username||`ID ${String(user.id)}`);
    if(!confirm(`Видалити акаунт «${username}»? Цю дію не можна скасувати.`))return;
    const confirmationCode=await requestOwnerDeleteCode(username);
    if(!confirmationCode){showButtonState(button,"Скасовано","error",900);return;}
    button.disabled=true;
    try{
      await authApi(`/admin/users/${encodeURIComponent(user.id)}`,{method:"DELETE",body:{confirmation_code:confirmationCode}});
      showButtonState(button,"Видалено","success",900);
      await loadAdminUsers(false);
    }catch(error){
      button.disabled=false;
      showButtonState(button,error?.status===403?"Неправильний код":"Помилка","error",1200);
      alert(error?.message||"Не вдалося видалити акаунт.");
    }
  }

  function closeAdminTempPassword(){
    adminTempPasswordModal?.classList.remove("active");
    document.body.classList.remove("edit-modal-open");
    if(adminTempPasswordValue)adminTempPasswordValue.textContent="—";
    if(adminTempPasswordUser)adminTempPasswordUser.textContent="—";
  }

  function showAdminTempPassword(username,password){
    if(!adminTempPasswordModal||!adminTempPasswordValue)return;
    if(adminTempPasswordUser)adminTempPasswordUser.textContent=`Акаунт: ${username||"—"}`;
    adminTempPasswordValue.textContent=String(password||"—");
    adminTempPasswordModal.classList.add("active");
    document.body.classList.add("edit-modal-open");
  }

  async function resolveRecoveryRequest(request,button){
    if(!authUser?.is_owner||!request)return;
    const username=String(request.username||"Користувач");
    if(!confirm(`Створити новий пароль для «${username}»? Усі активні сесії цього акаунта буде завершено.`))return;
    button.disabled=true;
    try{
      const data=await authApi(`/admin/recovery-requests/${encodeURIComponent(request.id)}/reset`,{method:"POST",body:{}});
      showButtonState(button,"Створено","success",1000);
      showAdminTempPassword(username,data?.new_password||data?.temporary_password||"");
      await loadAdminRecoveryRequests(false);
      await loadAdminUsers(false);
    }catch(error){
      button.disabled=false;
      showButtonState(button,"Помилка","error",1200);
      alert(error?.message||"Не вдалося створити новий пароль.");
    }
  }

  const ADMIN_RECOVERY_VISIBLE_ROWS=3;
  function fitAdminRecoveryViewport(){
    if(!adminRecoveryList)return;
    const rows=Array.from(adminRecoveryList.children).filter(row=>row.classList.contains("admin-recovery-row"));
    if(rows.length<=ADMIN_RECOVERY_VISIBLE_ROWS){
      adminRecoveryList.style.maxHeight="";
      adminRecoveryList.style.overflowY="";
      return;
    }
    const first=rows[0].getBoundingClientRect();
    const last=rows[ADMIN_RECOVERY_VISIBLE_ROWS-1].getBoundingClientRect();
    // Hidden admin pages cannot be measured. ResizeObserver refits when the rows become visible.
    if(!first.width||!first.height||!last.height)return;
    const style=getComputedStyle(adminRecoveryList);
    const padding=(parseFloat(style.paddingTop)||0)+(parseFloat(style.paddingBottom)||0);
    const height=last.bottom-first.top+padding;
    adminRecoveryList.style.maxHeight=`${height}px`;
    adminRecoveryList.style.overflowY="auto";
  }
  const adminRecoveryResizeObserver=typeof ResizeObserver==="function"
    ?new ResizeObserver(()=>requestAnimationFrame(fitAdminRecoveryViewport)):null;

  async function rejectRecoveryRequest(request,button){
    if(!authUser?.is_owner||!request)return;
    const username=String(request.username||"Користувач");
    if(!confirm(`Відмовити у відновленні доступу для «${username}»? Запит буде закрито, а пароль користувача не зміниться.`))return;
    button.disabled=true;
    try{
      await authApi(`/admin/recovery-requests/${encodeURIComponent(request.id)}/reject`,{method:"POST",body:{}});
      await loadAdminRecoveryRequests(false);
    }catch(error){
      button.disabled=false;
      alert(error?.message||"Не вдалося відмовити у відновленні доступу.");
    }
  }

  async function loadAdminRecoveryRequests(showFeedback=false){
    if(!adminRecoveryList)return;
    if(!authUser?.is_owner){
      adminRecoveryCache=[];
      adminRecoveryResizeObserver?.disconnect();
      adminRecoveryList.innerHTML="";
      adminRecoveryList.style.maxHeight="";
      adminRecoveryList.style.overflowY="";
      if(adminRecoveryCount)adminRecoveryCount.textContent="0";
      if(adminRecoveryStatus)adminRecoveryStatus.textContent="Запити на відновлення доступні лише головному адміністратору.";
      return;
    }
    if(adminRecoveryStatus)adminRecoveryStatus.textContent="Завантаження запитів...";
    try{
      const data=await authApi("/admin/recovery-requests?limit=350");
      const requests=Array.isArray(data.requests)?data.requests:[];
      const totalCount=Number.isFinite(Number(data?.total_count))?Number(data.total_count):requests.length;
      adminRecoveryCache=requests.map(item=>({...item}));
      adminRecoveryList.innerHTML="";
      if(adminRecoveryCount)adminRecoveryCount.textContent=String(totalCount);
      if(adminRecoveryStatus){
        if(!requests.length)adminRecoveryStatus.textContent="Запитів на відновлення немає.";
        else if(totalCount>requests.length)adminRecoveryStatus.textContent=`Показано останні ${requests.length} із ${totalCount} запитів.`;
        else adminRecoveryStatus.textContent="Останні запити на відновлення доступу.";
      }
      requests.forEach(item=>{
        const recoveryStatus=item.status==="pending"?"pending":item.status==="rejected"?"rejected":"resolved";
        const row=document.createElement("div");row.className=`admin-recovery-row ${recoveryStatus}`;
        const who=document.createElement("div");who.className="admin-recovery-who";
        const strong=document.createElement("strong");strong.textContent=item.username||"—";
        const meta=document.createElement("span");meta.textContent=`ID: ${String(item.user_id??"—")} · ${formatAdminDate(item.created_at)}`;
        who.append(strong,meta);
        const status=document.createElement("span");status.className=`admin-recovery-badge ${recoveryStatus}`;status.textContent=recoveryStatus==="pending"?"Очікує":recoveryStatus==="rejected"?"Відмовлено":"Пароль створено";
        const actions=document.createElement("div");actions.className="admin-recovery-actions";
        if(recoveryStatus==="pending"){
          const reset=document.createElement("button");reset.type="button";reset.textContent="Створити новий пароль";reset.className="admin-recovery-reset";reset.addEventListener("click",()=>resolveRecoveryRequest(item,reset));
          const reject=document.createElement("button");reject.type="button";reject.textContent="Відмовитись";reject.className="admin-recovery-reject";reject.addEventListener("click",()=>rejectRecoveryRequest(item,reject));
          actions.append(reset,reject);
        }else{
          const note=document.createElement("span");
          if(recoveryStatus==="rejected")note.textContent=item.resolved_at?`Відмовлено: ${formatAdminDate(item.resolved_at)}`:"Відмовлено";
          else note.textContent=item.resolved_at?`Вирішено: ${formatAdminDate(item.resolved_at)}`:"Вирішено";
          actions.append(note);
        }
        row.append(who,status,actions);adminRecoveryList.append(row);
      });
      adminRecoveryResizeObserver?.disconnect();
      Array.from(adminRecoveryList.children).slice(0,ADMIN_RECOVERY_VISIBLE_ROWS).forEach(row=>adminRecoveryResizeObserver?.observe(row));
      requestAnimationFrame(fitAdminRecoveryViewport);
      if(showFeedback&&adminRefresh)showButtonState(adminRefresh,"Оновлено","success",900);
    }catch(error){
      if(adminRecoveryStatus)adminRecoveryStatus.textContent=error?.message||"Не вдалося завантажити запити на відновлення.";
    }
  }

  window.addEventListener("resize",()=>requestAnimationFrame(fitAdminRecoveryViewport));

  function makeAdminBackupFromSnapshot(user,meta,activity,logins){
    const snapshot=activity?.state_snapshot&&typeof activity.state_snapshot==="object"?activity.state_snapshot:{};
    const settings=snapshot.settings&&typeof snapshot.settings==="object"?JSON.parse(JSON.stringify(snapshot.settings)):{};
    const exportedAt=new Date().toISOString();
    return {
      backup_format:"kbjv-full-backup-v2",
      schema_version:2,
      version:1,
      exported_at:exportedAt,
      export_scope:"all",
      products:Array.isArray(snapshot.products)?snapshot.products:[],
      archive:Array.isArray(snapshot.archive)?snapshot.archive:[],
      calculator:Array.isArray(snapshot.calculator)?snapshot.calculator:[],
      calculator_draft:String(snapshot.calculator_draft||""),
      daily_goal:snapshot.daily_goal&&typeof snapshot.daily_goal==="object"?snapshot.daily_goal:{},
      profile:snapshot.profile&&typeof snapshot.profile==="object"?snapshot.profile:{},
      calculator_quick_presets:Array.isArray(snapshot.calculator_quick_presets)?snapshot.calculator_quick_presets:[],
      settings,
      category_order:Array.isArray(settings.category_order)?settings.category_order:[],
      custom_categories:Array.isArray(settings.custom_categories)?settings.custom_categories:[],
      deleted_default_categories:Array.isArray(settings.deleted_default_categories)?settings.deleted_default_categories:[],
      departments_enabled:typeof settings.departments_enabled==="boolean"?settings.departments_enabled:true,
      admin_export:{
        format:"kbjv-admin-user-export-v1",
        exported_by:{id:authUser?.id??null,username:authUser?.username||""},
        account:{
          id:meta?.user?.id??user?.id??null,
          username:meta?.user?.username||user?.username||"",
          role:meta?.user?.role||user?.role||"member",
          created_at:meta?.user?.created_at||user?.created_at||null,
          last_login_at:meta?.user?.last_login_at||user?.last_login_at||null,
          last_seen_at:meta?.user?.last_seen_at||user?.last_seen_at||null,
          password_iterations:meta?.user?.password_iterations??null
        },
        state_updated_at:activity?.state_updated_at||null,
        state_revision:Number(activity?.state_revision||0),
        login_events:Array.isArray(logins?.logins)?logins.logins:[],
        audit_events:Array.isArray(activity?.events)?activity.events:[],
        state_storage:meta?.state||null,
        active_session_count:Number(meta?.active_session_count||0),
        active_sessions:Array.isArray(meta?.active_sessions)?meta.active_sessions:[],
        recovery_requests:Array.isArray(meta?.recovery_requests)?meta.recovery_requests:[],
        excluded_secrets:["password_hash","password_salt","session_tokens","owner_secrets"]
      }
    };
  }

  async function exportAdminUserData(user,button){
    if(!authUser?.is_owner||!user)return;
    button.disabled=true;
    showButtonState(button,"Збирання...","info",0);
    try{
      const [meta,activity,logins]=await Promise.all([
        authApi(`/admin/users/${encodeURIComponent(user.id)}/export-meta`),
        fetchAllAdminUserActivity(user.id),
        fetchAllAdminUserLogins(user.id)
      ]);
      const data=makeAdminBackupFromSnapshot(user,meta,activity,logins);
      const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");
      const safeName=String(user.username||`user-${user.id}`).replace(/[^\p{L}\p{N}._-]+/gu,"-").replace(/^-+|-+$/g,"")||`user-${user.id}`;
      a.href=url;a.download=`kbjv-${safeName}-full-backup-${new Date().toISOString().slice(0,10)}.json`;document.body.append(a);a.click();a.remove();URL.revokeObjectURL(url);
      showButtonState(button,"Експортовано","success",1200);
    }catch(error){
      showButtonState(button,"Помилка","error",1200);
      alert(error?.message||"Не вдалося експортувати дані користувача.");
    }finally{button.disabled=false;}
  }

  async function loadAdminUsers(showFeedback=true){
    if(!isAdminUser()||!adminUsersList)return;
    if(adminStatus)adminStatus.textContent="Завантаження користувачів...";
    try{
      const data=await authApi("/admin/users"),users=Array.isArray(data.users)?data.users:[];
      adminUsersCache=users.map(user=>({...user}));
      if(data.requested_by){authUser={...authUser,...data.requested_by};updateStoredAuthUser(authUser);}
      if(adminOwnerNote)adminOwnerNote.hidden=!authUser?.is_owner;
      adminUsersList.innerHTML="";
      if(adminUsersCount)adminUsersCount.textContent=String(users.length);
      if(adminAdminsCount)adminAdminsCount.textContent=String(users.filter(user=>user.role==="admin").length);
      if(adminMembersCount)adminMembersCount.textContent=String(users.filter(user=>user.role!=="admin").length);
      if(adminStatus)adminStatus.textContent=users.length?"Дані актуальні.":"Користувачів поки немає.";

      users.forEach(user=>{
        const row=document.createElement("div");row.className="admin-user-row admin-user-row-v60";
        const login=document.createElement("div");login.className="admin-user-cell";
        const loginStrong=document.createElement("strong");loginStrong.textContent=user.username||"—";
        const loginId=document.createElement("span");loginId.textContent=`ID: ${String(user.id)}`;login.append(loginStrong,loginId);

        const role=document.createElement("div");role.className="admin-user-cell";
        const badge=document.createElement("span");badge.className=`admin-role ${user.role==="admin"?"admin":""} ${user.is_owner?"owner":""}`;badge.textContent=roleLabel(user);role.append(badge);

        const created=makeAdminInfoCell("Реєстрація",formatAdminDate(user.created_at),true);
        const seen=makeAdminInfoCell("Останнє відвідування",formatAdminDate(user.last_seen_at),true);
        const lastLogin=makeAdminInfoCell("Останній вхід через пароль",formatAdminDate(user.last_login_at),true);
        const critical=latestCriticalAction(user);
        const red=makeAdminInfoCell("Остання червона дія",critical.time?`${critical.label} · ${formatAdminDate(critical.time)}`:"—",true);
        const count=makeAdminInfoCell("Входів через пароль",String(user.login_count??0));

        const actions=document.createElement("div");actions.className="admin-user-actions";
        const history=document.createElement("button");history.type="button";history.className="admin-history-button";history.textContent="Входи";history.addEventListener("click",()=>openAdminLoginHistory(user));
        const full=document.createElement("button");full.type="button";full.className="admin-history-button admin-full-button";full.textContent="Повна інформація";full.addEventListener("click",()=>openAdminFullInfo(user));
        actions.append(history,full);

        if(authUser?.is_owner){
          const exportUserButton=document.createElement("button");exportUserButton.type="button";exportUserButton.className="admin-export-user-button";exportUserButton.textContent="Експортувати всі дані";
          exportUserButton.addEventListener("click",()=>exportAdminUserData(user,exportUserButton));
          actions.append(exportUserButton);
        }

        if(authUser?.is_owner&&!user.is_owner){
          const roleButton=document.createElement("button");roleButton.type="button";roleButton.className=`admin-role-button ${user.role==="admin"?"demote":"promote"}`;
          roleButton.textContent=user.role==="admin"?"Зняти права адміністратора":"Надати права адміністратора";
          roleButton.addEventListener("click",()=>changeAdminRole(user,user.role==="admin"?"member":"admin",roleButton));
          const deleteButton=document.createElement("button");deleteButton.type="button";deleteButton.className="admin-delete-user-button";deleteButton.textContent="Видалити акаунт";
          deleteButton.addEventListener("click",()=>deleteAdminUser(user,deleteButton));
          actions.append(roleButton,deleteButton);
        }

        row.append(login,role,created,seen,lastLogin,red,count,actions);adminUsersList.append(row);
      });

      try{
        await loadAdminRecoveryRequests(false);
        await loadAdminAudit();
        if(showFeedback)showButtonState(adminRefresh,"Оновлено","success");
      }catch(auditError){
        if(adminAuditStatus)adminAuditStatus.textContent=auditError?.message||"Не вдалося завантажити історію активності.";
        if(showFeedback)showButtonState(adminRefresh,"Частково","error");
      }
    }catch(error){if(adminStatus)adminStatus.textContent=error?.message||"Не вдалося завантажити панель адміністратора.";if(showFeedback)showButtonState(adminRefresh,"Помилка","error");}
  }

  function renderAdminSimpleUsersList(users=adminUsersCache){
    if(!adminUsersModalList)return;
    const list=Array.isArray(users)?users:[];
    adminUsersModalList.innerHTML="";
    if(adminUsersModalStatus)adminUsersModalStatus.textContent=list.length?`Користувачів: ${list.length}`:"Користувачів поки немає.";
    if(!list.length){
      const empty=document.createElement("div");empty.className="admin-login-entry";empty.textContent="Список користувачів порожній.";adminUsersModalList.append(empty);return;
    }
    [...list].sort((a,b)=>Number(a.id)-Number(b.id)).forEach(user=>{
      const row=document.createElement("div");row.className="admin-simple-user-row";
      const name=document.createElement("div");name.className="admin-simple-user-name";name.textContent=user.username||"—";
      const id=document.createElement("div");id.className="admin-simple-user-id";id.textContent=`ID: ${String(user.id??"—")}`;
      const role=document.createElement("span");role.className=`admin-role ${user.role==="admin"?"admin":""} ${user.is_owner?"owner":""}`;role.textContent=roleLabel(user);
      row.append(name,id,role);adminUsersModalList.append(row);
    });
  }

  async function openAdminUsersModal(){
    if(!adminUsersModal)return;
    adminUsersModal.classList.add("active");
    document.body.classList.add("edit-modal-open");
    renderAdminSimpleUsersList();
    if(adminUsersCache.length)return;
    if(adminUsersModalStatus)adminUsersModalStatus.textContent="Завантаження користувачів...";
    try{
      const data=await authApi("/admin/users");
      adminUsersCache=Array.isArray(data.users)?data.users.map(user=>({...user})):[];
      renderAdminSimpleUsersList();
    }catch(error){
      if(adminUsersModalStatus)adminUsersModalStatus.textContent=error?.message||"Не вдалося завантажити список користувачів.";
    }
  }

  function closeAdminUsersModal(){adminUsersModal?.classList.remove("active");document.body.classList.remove("edit-modal-open");}

  function appendAdminVisitSection(title,note,items,timeKey,emptyText){
    if(!adminLoginsList)return;
    const section=document.createElement("section");section.className="admin-logins-section";
    const heading=document.createElement("div");heading.className="admin-logins-section-title";heading.textContent=title;section.append(heading);
    if(note){const description=document.createElement("div");description.className="admin-logins-section-note";description.textContent=note;section.append(description);}
    const scroll=document.createElement("div");scroll.className="admin-logins-scroll";
    if(!items.length){const empty=document.createElement("div");empty.className="admin-login-entry";empty.textContent=emptyText;scroll.append(empty);}
    else items.forEach((entry,index)=>{const row=document.createElement("div");row.className="admin-login-entry";row.textContent=`${index+1}. ${formatAdminDate(entry?.[timeKey])}`;scroll.append(row);});
    section.append(scroll);
    adminLoginsList.append(section);
  }

  async function fetchAllAdminUserLogins(userId){
    let beforeId=null;
    const seenCursors=new Set();
    const logins=[];
    let firstData=null;
    while(true){
      const params=new URLSearchParams({limit:"1000"});
      if(beforeId)params.set("before_id",String(beforeId));
      const data=await authApi(`/admin/users/${encodeURIComponent(userId)}/logins?${params.toString()}`);
      if(!firstData)firstData=data;
      if(Array.isArray(data.logins))logins.push(...data.logins);
      beforeId=Number(data.next_before_id)||null;
      if(!beforeId||seenCursors.has(beforeId))break;
      seenCursors.add(beforeId);
    }
    return {...(firstData||{}),logins,truncated:false};
  }

  async function fetchAllAdminUserActivity(userId,{types=""}={}){
    let beforeId=null;
    const seenCursors=new Set();
    const events=[];
    let firstData=null;
    while(true){
      const params=new URLSearchParams({limit:"1000"});
      if(types)params.set("types",types);
      if(beforeId)params.set("before_id",String(beforeId));
      const data=await authApi(`/admin/users/${encodeURIComponent(userId)}/activity?${params.toString()}`);
      if(!firstData)firstData=data;
      if(Array.isArray(data.events))events.push(...data.events);
      beforeId=Number(data.next_before_id)||null;
      if(!beforeId||seenCursors.has(beforeId))break;
      seenCursors.add(beforeId);
    }
    return {...(firstData||{}),events,truncated:false};
  }

  async function openAdminLoginHistory(user){
    if(!adminLoginsModal||!adminLoginsList)return;
    adminLoginsUser.textContent=`${user.username||"Користувач"} · ${roleLabel(user)}`;
    adminLoginsList.innerHTML='<div class="admin-login-entry">Завантаження...</div>';
    adminLoginsModal.classList.add("active");document.body.classList.add("edit-modal-open");
    try{
      const [loginData,activityData]=await Promise.all([
        fetchAllAdminUserLogins(user.id),
        fetchAllAdminUserActivity(user.id,{types:"visit"})
      ]);
      const logins=Array.isArray(loginData.logins)?loginData.logins:[];
      const visits=Array.isArray(activityData.events)?activityData.events:[];
      adminLoginsList.innerHTML="";
      appendAdminVisitSection(
        "Входи через логін і пароль",
        "Тут фіксуються тільки успішні авторизації з введенням логіна та пароля.",
        logins,
        "login_at",
        "Входів через логін і пароль ще немає."
      );
      appendAdminVisitSection(
        "Відвідування сайту",
        "Тут показано відкриття або повернення на сайт за повідомленням браузера. Ці події не є незалежним підтвердженням сервера.",
        visits,
        "created_at",
        "Відвідувань сайту ще немає."
      );
    }catch(error){
      adminLoginsList.innerHTML="";
      const row=document.createElement("div");row.className="admin-login-entry";row.textContent=error?.message||"Не вдалося завантажити входи та відвідування.";adminLoginsList.append(row);
    }
  }

  function renderAdminActionTypes(){
    if(!adminActionTypesList)return;
    adminActionTypesList.innerHTML="";
    Object.entries(ADMIN_AUDIT_LABELS).forEach(([type,label])=>{
      const row=document.createElement("div");row.className="admin-action-type-row";
      const head=document.createElement("div");head.className="admin-action-type-head";
      const badge=document.createElement("span");badge.className="admin-audit-badge";badge.textContent=label;
      const desc=document.createElement("div");desc.className="admin-action-type-description";desc.textContent=ADMIN_AUDIT_DESCRIPTIONS[type]||"Подія журналу активності.";
      head.append(badge);row.append(head,desc);adminActionTypesList.append(row);
    });
  }

  function openAdminActionTypes(){
    if(!adminActionTypesModal)return;
    renderAdminActionTypes();
    adminActionTypesModal.classList.add("active");
    document.body.classList.add("edit-modal-open");
  }

  function closeAdminActionTypes(){adminActionTypesModal?.classList.remove("active");document.body.classList.remove("edit-modal-open");}

  function adminActivityLabel(type){return ADMIN_AUDIT_LABELS[type]||"Дія";}

  const ADMIN_METADATA_LABELS={
    calculator_items:"Записи калькулятора",calculator:"Калькулятор",calculator_draft:"Чернетка калькулятора",daily_goal:"Денна ціль",products:"КБЖВ-блоки",archive:"Архів",settings:"Налаштування",calculator_quick_presets:"Швидкі значення калькулятора",product:"Продукт",profile:"Профіль",changed_fields:"Змінені поля",archive_composition:"Склад архіву",total:"Підсумок",scope:"Обсяг",version:"Версія",backup_format:"Формат резервної копії",page:"Сторінка",installed:"PWA встановлено",name:"Назва",weight:"Вага",text:"Текст",kcal:"Калорії",protein:"Білки",fat:"Жири",carb:"Вуглеводи",sugar:"Цукри",salt:"Сіль",fiber:"Клітковина",display_name:"Відображуване ім’я",full_name:"ПІБ",birth_date:"Дата народження",height:"Зріст",avatar:"Фото профілю",avatar_present:"Фото профілю збережено",sort_mode:"Сортування",random_sort_seed:"Випадкове сортування",active_tab:"Активна вкладка",stats_to_today:"Статистика до сьогодні",departments_enabled:"Відділи увімкнені",category_order:"Порядок відділів",custom_categories:"Власні відділи",deleted_default_categories:"Видалені стандартні відділи",database_updated_at:"Оновлення бази",site_data_visible:"Поточні дані сайту показані"
  };
  function adminMetadataLabel(key,path=[]){
    const root=String(path[0]||"");
    if(key==="full_name"&&root==="products")return "Опис продукту";
    if(key==="full_name_no_data"&&root==="products")return "Опис продукту: немає даних";
    if(key==="schema_version")return "Версія структури";
    return ADMIN_METADATA_LABELS[key]||key;
  }
  function translateAdminMetadata(value,path=[]){
    if(value===null||value===undefined)return "Немає даних";
    if(typeof value==="boolean")return value?"Так":"Ні";
    if(Array.isArray(value))return value.map((item,index)=>translateAdminMetadata(item,[...path,String(index)]));
    if(value&&typeof value==="object"){
      const out={};
      Object.entries(value).forEach(([key,item])=>{const label=adminMetadataLabel(key,path);out[label]=key==="avatar"?(item?"Збережено":"Немає даних"):translateAdminMetadata(item,[...path,key]);});
      return out;
    }
    return value;
  }

  function adminSearchNormalize(value){
    return String(value??"").normalize("NFKC").toLocaleLowerCase("uk-UA");
  }

  function flattenAdminState(value,path="",out=[]){
    if(Array.isArray(value)){
      if(!value.length)out.push({path:path||"Дані",value:"[]"});
      value.forEach((item,index)=>flattenAdminState(item,`${path}${path?" → ":""}№${index+1}`,out));
      return out;
    }
    if(value&&typeof value==="object"){
      const entries=Object.entries(value);
      if(!entries.length)out.push({path:path||"Дані",value:"{}"});
      entries.forEach(([key,item])=>flattenAdminState(item,`${path}${path?" → ":""}${key}`,out));
      return out;
    }
    out.push({path:path||"Дані",value:value===null||value===undefined?"Немає даних":String(value)});
    return out;
  }

  function appendHighlightedLiteral(target,text,query){
    const source=String(text??"");
    const normalized=adminSearchNormalize(source),needle=adminSearchNormalize(query);
    if(!needle){target.textContent=source;return;}
    let start=0;
    while(start<source.length){
      const index=normalized.indexOf(needle,start);
      if(index<0){target.append(document.createTextNode(source.slice(start)));break;}
      if(index>start)target.append(document.createTextNode(source.slice(start,index)));
      const mark=document.createElement("mark");mark.textContent=source.slice(index,index+query.length);target.append(mark);
      start=index+query.length;
    }
  }

  function renderAdminStateSearch(){
    if(!adminFullStateSearchResults||!adminFullStateSearchStatus)return;
    const query=String(adminFullStateSearch?.value||"").trim();
    adminFullStateSearchResults.innerHTML="";
    if(!query){
      adminFullStateSearchResults.hidden=true;
      if(adminFullState)adminFullState.hidden=false;
      adminFullStateSearchStatus.textContent="Пошук виконується буквально за введеними літерами.";
      return;
    }
    if(!adminFullStateSnapshot||typeof adminFullStateSnapshot!=="object"){
      adminFullStateSearchResults.hidden=false;
      if(adminFullState)adminFullState.hidden=true;
      adminFullStateSearchStatus.textContent="Поточні дані ще не синхронізовані.";
      return;
    }
    const translated=translateAdminMetadata(adminFullStateSnapshot);
    const needle=adminSearchNormalize(query);
    const matches=flattenAdminState(translated).filter(item=>adminSearchNormalize(`${item.path} ${item.value}`).includes(needle));
    adminFullStateSearchResults.hidden=false;
    if(adminFullState)adminFullState.hidden=true;
    adminFullStateSearchStatus.textContent=matches.length?`Знайдено точних збігів: ${matches.length}.`:`За «${query}» нічого не знайдено.`;
    matches.slice(0,250).forEach(item=>{
      const row=document.createElement("div");row.className="admin-state-search-result";
      const path=document.createElement("div");path.className="admin-state-search-path";appendHighlightedLiteral(path,item.path,query);
      const value=document.createElement("div");value.className="admin-state-search-value";appendHighlightedLiteral(value,item.value,query);
      row.append(path,value);adminFullStateSearchResults.append(row);
    });
    if(matches.length>250){
      const more=document.createElement("div");more.className="admin-login-entry";more.textContent=`Показано перші 250 із ${matches.length} збігів. Уточніть пошук.`;adminFullStateSearchResults.append(more);
    }
  }

  async function openAdminFullInfo(user){
    if(!adminFullModal||!adminFullList)return;
    adminFullUser.textContent=`${user.username||"Користувач"} · ${roleLabel(user)} · ID ${String(user.id)}`;
    if(adminFullSummary)adminFullSummary.innerHTML="";
    adminFullStateSnapshot=null;
    if(adminFullStateSearch)adminFullStateSearch.value="";
    if(adminFullStateSearchResults){adminFullStateSearchResults.innerHTML="";adminFullStateSearchResults.hidden=true;}
    if(adminFullStateSearchStatus)adminFullStateSearchStatus.textContent="Пошук виконується буквально за введеними літерами.";
    if(adminFullState){adminFullState.hidden=false;adminFullState.textContent="Завантаження поточних даних...";}
    adminFullList.innerHTML='<div class="admin-login-entry">Завантаження повної історії...</div>';
    adminFullModal.classList.add("active");document.body.classList.add("edit-modal-open");
    try{
      const data=await fetchAllAdminUserActivity(user.id);
      const details=data.user||user;
      if(adminFullSummary){
        const fields=[
          ["Роль",roleLabel(details)],
          ["Реєстрація",formatAdminDate(details.created_at)],
          ["Останнє відвідування",formatAdminDate(details.last_seen_at)],
          ["Останній вхід через пароль",formatAdminDate(details.last_login_at)],
          ["Кількість входів через пароль",String(details.login_count??user.login_count??0)]
        ];
        fields.forEach(([label,value])=>{const box=document.createElement("div");const strong=document.createElement("strong");strong.textContent=label;const span=document.createElement("span");span.textContent=value;box.append(strong,span);adminFullSummary.append(box);});
      }
      if(adminFullState){
        if(data.state_snapshot&&typeof data.state_snapshot==="object"){
          adminFullStateSnapshot=data.state_snapshot;
          const state=document.createElement("pre");state.className="admin-full-state-pre";state.textContent=JSON.stringify(translateAdminMetadata(data.state_snapshot),null,2);
          adminFullState.innerHTML="";
          const updated=document.createElement("div");updated.className="admin-full-state-updated";updated.textContent=`Стан синхронізовано: ${formatAdminDate(data.state_updated_at)}`;
          adminFullState.append(updated,state);
        }else{adminFullStateSnapshot=null;adminFullState.textContent=authUser?.is_owner?"Поточні дані ще не синхронізовані. Вони з’являться після того, як користувач відкриє оновлену версію сайту з інтернетом.":"Для захисту приватності ці дані може переглядати тільки головний адміністратор.";}
      }
      const events=Array.isArray(data.events)?data.events:[];
      adminFullList.innerHTML="";
      if(!events.length){adminFullList.innerHTML='<div class="admin-login-entry">Повна історія дій порожня.</div>';return;}
            events.forEach(event=>{
        const row=document.createElement("div");row.className="admin-full-entry";
        const head=document.createElement("div");head.className="admin-full-entry-head";
        const badge=document.createElement("span");badge.className="admin-audit-badge";badge.textContent=adminActivityLabel(event.event_type);
        const time=document.createElement("time");time.textContent=formatAdminDate(event.created_at);head.append(badge,time);
        const message=document.createElement("div");message.className="admin-full-entry-message";message.textContent=event.message||"—";
        row.append(head,message);
        if(event.metadata){
          let metadataText="";
          try{const parsed=typeof event.metadata==="string"?JSON.parse(event.metadata):event.metadata;metadataText=JSON.stringify(translateAdminMetadata(parsed),null,2);}catch(_){metadataText=String(event.metadata);}
          if(metadataText&&metadataText!=="{}"){
            const meta=document.createElement("pre");meta.className="admin-full-entry-meta";meta.textContent=metadataText;row.append(meta);
          }
        }
        adminFullList.append(row);
      });
    }catch(error){adminFullList.innerHTML="";const row=document.createElement("div");row.className="admin-login-entry";row.textContent=error?.message||"Не вдалося завантажити повну інформацію.";adminFullList.append(row);}
  }

  function closeAdminLoginHistory(){adminLoginsModal?.classList.remove("active");document.body.classList.remove("edit-modal-open");}
  function closeAdminFullInfo(){adminFullModal?.classList.remove("active");document.body.classList.remove("edit-modal-open");adminFullStateSnapshot=null;if(adminFullStateSearch)adminFullStateSearch.value="";}

  const BUTTON_STATE_COLORS={
    success:{background:"#22c55e",shadow:"0 0 0 1px rgba(34,197,94,.30),0 0 18px rgba(34,197,94,.30)"},
    error:{background:"#ef4444",shadow:"0 0 0 1px rgba(239,68,68,.30),0 0 18px rgba(239,68,68,.30)"},
    info:{background:"#7289da",shadow:"0 0 0 1px rgba(114,137,218,.30),0 0 18px rgba(114,137,218,.30)"}
  };
  function restoreButtonInlineState(button){
    if(!button?._statusInlineSnapshot)return;
    const snapshot=button._statusInlineSnapshot;
    ["background-color","color","box-shadow"].forEach(property=>{
      const saved=snapshot[property];
      if(saved?.value)button.style.setProperty(property,saved.value,saved.priority||"");
      else button.style.removeProperty(property);
    });
    button._statusInlineSnapshot=null;
  }
  function applyButtonInlineState(button,state){
    const palette=BUTTON_STATE_COLORS[state];
    if(!button||!palette)return;
    if(!button._statusInlineSnapshot){
      button._statusInlineSnapshot={};
      ["background-color","color","box-shadow"].forEach(property=>{
        button._statusInlineSnapshot[property]={
          value:button.style.getPropertyValue(property),
          priority:button.style.getPropertyPriority(property)
        };
      });
    }
    button.style.setProperty("background-color",palette.background,"important");
    button.style.setProperty("color","#fff","important");
    button.style.setProperty("box-shadow",palette.shadow,"important");
  }
  function clearButtonStatus(button) {
    if(!button)return;
    button.classList.remove("button-status-success","button-status-error","button-status-info","button-status-entering","button-status-leaving");
    restoreButtonInlineState(button);
  }
  const BUTTON_FEEDBACK_MS = 1450;
  const BUTTON_STATUS_OUT_MS = 250;
  function showButtonState(button,text,state,duration=BUTTON_FEEDBACK_MS) {
    if (!button) return;
    if (!button.dataset.originalText) button.dataset.originalText = button.textContent.trim();

    clearTimeout(button._statusTimeout);
    clearTimeout(button._statusLeaveTimeout);
    clearButtonStatus(button);

    button.textContent = text;
    if (state) {
      void button.offsetWidth;
      button.classList.add(`button-status-${state}`,"button-status-entering");
      applyButtonInlineState(button,state);
    }

    const effectiveDuration=duration===0?0:BUTTON_FEEDBACK_MS;
    if (effectiveDuration > 0) {
      const leaveAt=Math.max(0,effectiveDuration-BUTTON_STATUS_OUT_MS);
      button._statusTimeout=setTimeout(()=>{
        button.classList.remove("button-status-entering");
        button.classList.add("button-status-leaving");
        button._statusLeaveTimeout=setTimeout(()=>{
          button.textContent=button.dataset.originalText||"";
          clearButtonStatus(button);
        },BUTTON_STATUS_OUT_MS);
      },leaveAt);
    }
  }
  function setButtonStatusPermanent(button,text,state) { showButtonState(button,text,state,0); }

  function formatConsoleDate(date = new Date()) {
    const d=String(date.getDate()).padStart(2,"0"),m=String(date.getMonth()+1).padStart(2,"0"),y=date.getFullYear();
    const h=String(date.getHours()).padStart(2,"0"),mi=String(date.getMinutes()).padStart(2,"0"),se=String(date.getSeconds()).padStart(2,"0");
    return `${d}.${m}.${y} - ${h}:${mi}:${se}`;
  }
  const MAX_CONSOLE_ITEMS=500;
  let storageLastError="";
  let storageErrorShownAt=0;

  let storageTransaction=null;

  function beginStorageTransaction(label="Операція"){
    if(storageTransaction)return false;
    storageTransaction={label,original:new Map(),touched:new Set(),changed:new Set(),failed:false,error:"",needsSync:false};
    return true;
  }

  function rememberStorageOriginal(key){
    if(!storageTransaction||storageTransaction.original.has(key))return;
    storageTransaction.original.set(key,localStorage.getItem(key));
    storageTransaction.touched.add(key);
  }

  function rollbackStorageTransaction(){
    const tx=storageTransaction;
    if(!tx)return true;
    const failedKeys=[];
    try{
      // localStorage.setItem is atomic for one key. In particular, NEVER remove a
      // previous value before trying to restore it: if setItem fails again,
      // removing it would destroy the only surviving copy.
      for(const key of [...tx.changed].reverse()){
        const original=tx.original.get(key);
        try{
          // No write is necessary if a failed setItem left the old value intact.
          if(localStorage.getItem(key)===original)continue;
          if(original===null)localStorage.removeItem(key);
          else localStorage.setItem(key,original);
        }catch(_){failedKeys.push(key);}
      }
    }finally{storageTransaction=null;}
    if(failedKeys.length){
      // Do not claim an atomic rollback if the browser is still rejecting writes.
      storageLastError=`Не вдалося відновити ${failedKeys.length} запис(ів) після збою сховища. Не очищуйте дані браузера; зробіть резервну копію та звільніть місце.`;
      console.error("Incomplete storage rollback",failedKeys.length);
      return false;
    }
    return true;
  }

  function finishStorageTransaction(){
    const tx=storageTransaction;
    if(!tx)return true;
    const failed=tx.failed;
    const error=tx.error;
    const needsSync=tx.needsSync;
    if(failed){
      const restored=rollbackStorageTransaction();
      if(restored)storageLastError=error||"Не вдалося зберегти дані. Попередній стан відновлено.";
      renderSystemStatus();
      return false;
    }
    storageTransaction=null;
    storageLastError="";
    if(needsSync)scheduleAdminStateSync(1000);
    return true;
  }

  function safeStorageSet(key,value,{critical=false}={}){
    const text=String(value);
    rememberStorageOriginal(key);
    try{
      localStorage.setItem(key,text);
      if(storageTransaction)storageTransaction.changed.add(key);
      if(!storageTransaction)storageLastError="";
      return true;
    }catch(error){
      const quota=error?.name==="QuotaExceededError"||error?.name==="NS_ERROR_DOM_QUOTA_REACHED";
      if(storageTransaction){
        if(key===UNDO_KEY&&!critical)return false;
        storageTransaction.failed=true;
        storageTransaction.error=quota
          ? "Локального сховища недостатньо. Операцію скасовано повністю, попередні дані збережено."
          : "Не вдалося записати дані. Операцію скасовано повністю, попередні дані збережено.";
        return false;
      }
      // Для одиночного критичного запису спершу жертвуємо лише Undo, а не основними даними.
      if(quota&&critical&&key!==UNDO_KEY){
        try{
          localStorage.removeItem(UNDO_KEY);
          localStorage.setItem(key,text);
          storageLastError="Сховище було майже заповнене: історію скасувань очищено, основні дані збережено.";
          renderSystemStatus();
          return true;
        }catch(_){/* handled below */}
      }
      storageLastError=quota
        ? "Локальне сховище заповнене. Зробіть експорт і звільніть місце."
        : "Не вдалося записати дані в локальне сховище.";
      if(critical&&Date.now()-storageErrorShownAt>60000){
        storageErrorShownAt=Date.now();
        alert(storageLastError);
      }
      renderSystemStatus();
      return false;
    }
  }

  function safeStorageRemove(key){
    rememberStorageOriginal(key);
    try{localStorage.removeItem(key);if(storageTransaction)storageTransaction.changed.add(key);return true;}
    catch(error){
      if(storageTransaction){storageTransaction.failed=true;storageTransaction.error="Не вдалося змінити локальне сховище. Операцію скасовано.";}
      return false;
    }
  }

  function saveConsoleLocal(){
    if(consoleItems.length>MAX_CONSOLE_ITEMS)consoleItems=consoleItems.slice(-MAX_CONSOLE_ITEMS);
    safeStorageSet(CONSOLE_KEY,JSON.stringify(consoleItems));
  }

  let auditFlushInProgress=false;
  let lastSiteVisitQueuedAt=0;

  function isClearSiteAuditMessage(message){
    return String(message||"").trim()==="Очищено локальні дані сайту для поточного акаунта.";
  }

  const AUDIT_DB_NAME="kbjv-8321-audit-queue";
  const AUDIT_DB_VERSION=1;
  const AUDIT_STORE="events";
  let auditDbPromise=null;

  function legacyAuditQueue(){
    try{const value=JSON.parse(localStorage.getItem(AUDIT_QUEUE_KEY)||"[]");return Array.isArray(value)?value:[];}
    catch(_){return [];}
  }
  function saveLegacyAuditQueue(items){safeStorageSet(AUDIT_QUEUE_KEY,JSON.stringify(Array.isArray(items)?items:[]));}

  function openAuditDb(){
    if(!("indexedDB" in window))return Promise.reject(new Error("IndexedDB недоступна"));
    if(auditDbPromise)return auditDbPromise;
    auditDbPromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open(AUDIT_DB_NAME,AUDIT_DB_VERSION);
      request.onupgradeneeded=()=>{
        const db=request.result;
        const store=db.objectStoreNames.contains(AUDIT_STORE)?request.transaction.objectStore(AUDIT_STORE):db.createObjectStore(AUDIT_STORE,{keyPath:"id"});
        if(!store.indexNames.contains("user_id"))store.createIndex("user_id","user_id",{unique:false});
      };
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>{auditDbPromise=null;reject(request.error||new Error("IndexedDB помилка"));};
    });
    return auditDbPromise;
  }

  async function migrateLegacyAuditQueue(){
    if(!authUser)return;
    const legacy=legacyAuditQueue();
    if(!legacy.length)return;
    try{
      const db=await openAuditDb();
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(AUDIT_STORE,"readwrite"),store=tx.objectStore(AUDIT_STORE);
        legacy.forEach(item=>store.put({...item,user_id:Number(authUser.id)}));
        tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
      });
      safeStorageRemove(AUDIT_QUEUE_KEY);
    }catch(_){/* fallback remains in localStorage */}
  }

  async function persistAuditItem(item){
    try{
      const db=await openAuditDb();
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(AUDIT_STORE,"readwrite");
        tx.objectStore(AUDIT_STORE).put(item);
        tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
      });
      return true;
    }catch(_){
      const queue=legacyAuditQueue();queue.push(item);
      // fallback is bounded only to protect core localStorage if IndexedDB is unavailable
      while(queue.length>3000)queue.shift();
      saveLegacyAuditQueue(queue);
      return false;
    }
  }

  async function getAuditBatch(limit=15){
    const userId=Number(authUser?.id||0);
    if(!userId)return [];
    try{
      await migrateLegacyAuditQueue();
      const db=await openAuditDb();
      return await new Promise((resolve,reject)=>{
        const tx=db.transaction(AUDIT_STORE,"readonly"),index=tx.objectStore(AUDIT_STORE).index("user_id");
        const request=index.getAll(IDBKeyRange.only(userId),limit);
        request.onsuccess=()=>resolve(Array.isArray(request.result)?request.result:[]);
        request.onerror=()=>reject(request.error);
      });
    }catch(_){return legacyAuditQueue().filter(item=>Number(item.user_id||userId)===userId).slice(0,limit);}
  }

  async function deleteAuditItems(ids){
    if(!ids.length)return;
    try{
      const db=await openAuditDb();
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(AUDIT_STORE,"readwrite"),store=tx.objectStore(AUDIT_STORE);
        ids.forEach(id=>store.delete(id));
        tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
      });
    }catch(_){
      const remove=new Set(ids);saveLegacyAuditQueue(legacyAuditQueue().filter(item=>!remove.has(item.id)));
    }
  }

  async function clearAuditQueueForUser(userId){
    try{
      const db=await openAuditDb();
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(AUDIT_STORE,"readwrite"),index=tx.objectStore(AUDIT_STORE).index("user_id");
        const request=index.openCursor(IDBKeyRange.only(Number(userId)));
        request.onsuccess=()=>{const cursor=request.result;if(cursor){cursor.delete();cursor.continue();}};
        tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
      });
    }catch(_){/* ignore */}
    const queue=legacyAuditQueue().filter(item=>Number(item.user_id||0)!==Number(userId));
    if(queue.length)saveLegacyAuditQueue(queue);else safeStorageRemove(AUDIT_QUEUE_KEY);
  }

  function queueAuditAction(message,occurredAt=new Date().toISOString(),eventType="site_action",metadata=null){
    if(!authUser)return;
    const item={
      id:createId("audit"),user_id:Number(authUser.id),
      event_type:["site_action","visit"].includes(String(eventType))?String(eventType):"site_action",
      message:String(message??"Невідома дія").slice(0,1000),
      occurred_at:String(occurredAt||new Date().toISOString()),
      metadata:metadata&&typeof metadata==="object"?metadata:null
    };
    void persistAuditItem(item).then(()=>flushAuditQueue());
  }

  function recordSiteVisit(){
    if(!authUser)return;
    const now=Date.now();
    if(now-lastSiteVisitQueuedAt<60000)return;
    lastSiteVisitQueuedAt=now;
    queueAuditAction("Відкрито або повернуто на передній план сайт із чинною сесією.",new Date(now).toISOString(),"visit",{
      page:location.pathname,
      installed:window.matchMedia?.("(display-mode: standalone)")?.matches||navigator.standalone===true
    });
  }

  async function flushAuditQueue(){
    if(auditFlushInProgress||!authToken||!navigator.onLine)return;
    auditFlushInProgress=true;
    try{
      while(authToken&&navigator.onLine){
        const batch=await getAuditBatch(15);
        if(!batch.length)break;
        try{
          const response=await authApi("/audit/batch",{method:"POST",body:{events:batch.map(item=>({event_type:item.event_type,message:item.message,occurred_at:item.occurred_at,metadata:item.metadata}))}});
          const accepted=Math.max(0,Math.min(batch.length,Number(response?.accepted||batch.length)));
          await deleteAuditItems(batch.slice(0,accepted).map(item=>item.id));
          if(!accepted)break;
        }catch(error){
          if(error?.status===400){await deleteAuditItems([batch[0]?.id].filter(Boolean));continue;}
          break;
        }
      }
    }finally{auditFlushInProgress=false;}
  }

  let stateSyncTimer=null;
  let syncInProgress=false;
  let syncApplyingRemote=false;
  let syncConflict=false;
  let syncStatusMessage="Ще не виконувалася";
  let lastStateSnapshotFingerprint="";
  let externalReloadTimer=null;

  function currentUserPrefix(){return authUser?`kbjv_8321_user_${String(authUser.id)}_`:"";}

  function buildSyncSnapshot(){
    const settings={...collectBackupSettings()};
    delete settings.active_tab;
    return {
      schema_version:1,
      profile:normalizeProfile(profileData),
      daily_goal:normalizeDailyGoal(dailyGoal),
      products:products.map((product,index)=>normalizeProduct(product,index)),
      calculator:calculatorItems.map(item=>normalizeCalculatorItem(item)),
      calculator_draft:String(calcInput?.value??localStorage.getItem(CALCULATOR_DRAFT_KEY)??""),
      archive:JSON.parse(JSON.stringify(archiveItems)),
      calculator_quick_presets:normalizeQuickPresets(calculatorQuickPresets),
      settings
    };
  }

  function buildAdminStateSnapshot(){return buildSyncSnapshot();}

  function syncFingerprint(snapshot){
    try{return JSON.stringify(snapshot||{});}catch(_){return "";}
  }

  function localSnapshotHasData(snapshot=buildSyncSnapshot()){
    const profile=snapshot?.profile||{};
    return Boolean(
      (Array.isArray(snapshot?.products)&&snapshot.products.length)||
      (Array.isArray(snapshot?.calculator)&&snapshot.calculator.length)||
      (Array.isArray(snapshot?.archive)&&snapshot.archive.length)||
      String(snapshot?.calculator_draft||"").trim()||
      (Array.isArray(snapshot?.calculator_quick_presets)&&snapshot.calculator_quick_presets.length)||
      Object.values(profile).some(value=>String(value||"").length)||
      snapshot?.daily_goal?.enabled||
      Object.entries(snapshot?.daily_goal||{}).some(([key,value])=>key!=="enabled"&&Number(value)>0)||
      (Array.isArray(snapshot?.settings?.custom_categories)&&snapshot.settings.custom_categories.length)||
      (Array.isArray(snapshot?.settings?.deleted_default_categories)&&snapshot.settings.deleted_default_categories.length)||
      (Array.isArray(snapshot?.settings?.category_order)&&snapshot.settings.category_order.join("|")!==defaultCategoryOrder().join("|"))||
      snapshot?.settings?.random_sort_seed!=null||
      Boolean(snapshot?.settings?.database_updated_at)||
      snapshot?.settings?.departments_enabled===false||
      snapshot?.settings?.stats_to_today===true||
      snapshot?.settings?.site_data_visible===false||
      (snapshot?.settings?.sort_mode&&snapshot.settings.sort_mode!=="categories")
    );
  }

  function markLocalDataChanged(){
    if(syncApplyingRemote||!authUser)return true;
    // Both synchronization markers are critical. When called from a transaction,
    // failure aborts and rolls back the data write as well.
    const dirty=safeStorageSet(SYNC_DIRTY_KEY,"1",{critical:true});
    const timestamp=dirty&&safeStorageSet(SYNC_LOCAL_UPDATED_KEY,new Date().toISOString(),{critical:true});
    if(!dirty||!timestamp){
      syncStatusMessage="Помилка позначення змін для синхронізації";
      renderSystemStatus();
      return false;
    }
    syncStatusMessage="Є локальні зміни";
    lastStateSnapshotFingerprint="";
    if(storageTransaction)storageTransaction.needsSync=true;
    else scheduleAdminStateSync(1000);
    renderSystemStatus();
    return true;
  }

  function persistUserChange(label,write){
    const ownTransaction=!storageTransaction;
    if(ownTransaction)beginStorageTransaction(label);
    let wrote=false;
    try{wrote=write()!==false;if(wrote)wrote=markLocalDataChanged();}
    catch(error){
      if(storageTransaction){storageTransaction.failed=true;storageTransaction.error=String(error?.message||"Помилка локального запису.");}
      else throw error;
    }
    if(ownTransaction){
      if(!finishStorageTransaction()||!wrote)return storageWriteFailed();
      return true;
    }
    return wrote&&!storageTransaction?.failed;
  }

  function setSyncMeta(revision,updatedAt,{dirty=false,status="Синхронізовано"}={}){
    if(!beginStorageTransaction("Оновлення стану синхронізації")){
      syncStatusMessage="Не вдалося підтвердити синхронізацію: локальна операція ще триває";
      renderSystemStatus();return false;
    }
    safeStorageSet(SYNC_REVISION_KEY,String(Math.max(0,Number(revision)||0)),{critical:true});
    safeStorageSet(SYNC_DIRTY_KEY,dirty?"1":"0",{critical:true});
    if(updatedAt)safeStorageSet(SYNC_LAST_AT_KEY,String(updatedAt),{critical:true});
    if(!finishStorageTransaction()){
      syncStatusMessage="Сервер відповів, але позначку синхронізації зберегти не вдалося";
      renderSystemStatus();return false;
    }
    syncConflict=false;
    syncStatusMessage=status;
    renderSystemStatus();return true;
  }

  function reloadPrimaryStateFromStorage(){
    if(!appInitialized||!authUser)return;
    departmentsEnabled=localStorage.getItem(DEPARTMENTS_ENABLED_KEY)!=="0";
    currentSort=localStorage.getItem(SORT_KEY)||"categories";
    if(!VALID_SORT_MODES.has(currentSort))currentSort=departmentsEnabled?"categories":"initial";
    products=loadArray(PRODUCTS_KEY).map((p,i)=>normalizeProduct(p,i));
    calculatorItems=loadArray(CALCULATOR_KEY).map(normalizeCalculatorItem);
    archiveItems=loadArray(ARCHIVE_KEY);
    consoleItems=loadArray(CONSOLE_KEY).slice(-MAX_CONSOLE_ITEMS);
    const draft=localStorage.getItem(CALCULATOR_DRAFT_KEY);
    if(calcInput)calcInput.value=draft||"";
    try{dailyGoal={enabled:false,kcal:0,protein:0,fat:0,carb:0,sugar:0,salt:0,fiber:0,...(JSON.parse(localStorage.getItem(DAILY_GOAL_KEY)||"{}")||{})};}catch(_){}
    statsToTodayEnabled=localStorage.getItem(STATS_TO_TODAY_KEY)==="1";
    siteDataVisible=localStorage.getItem(SITE_DATA_VISIBLE_KEY)!=="0";
    loadProfile();
    loadCalculatorQuickPresets();
    populateProductCategorySelects();
    updateSortOptionState();
    for(const key of Object.keys(goalInputs))if(goalInputs[key])goalInputs[key].value=dailyGoal[key]||"";
    renderProducts(searchInput?.value||"");renderCalculatorLog();updateTotals();renderDailyGoal();renderArchive();renderConsole();renderStatistics();updateSiteDataCounts();renderSystemStatus();
  }

  function validateSyncSnapshotV91(snapshot){
    const obj=v=>v!==null&&typeof v==="object"&&!Array.isArray(v);
    const text=v=>typeof v==="string";
    const number=v=>v===undefined||v===null||v===""||((typeof v==="number"||typeof v==="string")&&String(v).trim()!==""&&Number.isFinite(Number(String(v).trim().replace(",",".")))&&Number(String(v).trim().replace(",","."))>=0);
    const pairs=[["protein","proteins"],["fat","fats"],["carb","carbs"],["sugar","sugars"],["fiber","fibre"]];
    const metrics=["kcal","protein","proteins","fat","fats","carb","carbs","sugar","sugars","salt","fiber","fibre"];
    const nutrition=row=>{
      if(!obj(row)||metrics.some(k=>!number(row[k]))||!number(row.weight))return false;
      for(const [a,b] of pairs){
        if(row[a]!==undefined&&row[a]!==null&&row[b]!==undefined&&row[b]!==null&&Number(String(row[a]).replace(",","."))!==Number(String(row[b]).replace(",",".")))return false;
      }
      return true;
    };
    if(!obj(snapshot))return false;
    // Synchronization must be a complete snapshot. A partial object could wipe local data.
    if(snapshot.schema_version!==1)return false;
    for(const key of ["products","calculator","archive","calculator_quick_presets"]){
      if(!Array.isArray(snapshot[key]))return false;
    }
    if(!text(snapshot.calculator_draft)||!obj(snapshot.profile)||!obj(snapshot.settings)||!obj(snapshot.daily_goal))return false;
  if(snapshot.daily_goal!==undefined){
      if(!obj(snapshot.daily_goal))return false;
      if(snapshot.daily_goal.enabled!==undefined&&typeof snapshot.daily_goal.enabled!=="boolean")return false;
      if(!nutrition(snapshot.daily_goal))return false;
    }
    if(snapshot.settings!==undefined){
      const setting=snapshot.settings;
      if(!obj(setting))return false;
      for(const key of ["custom_categories","category_order","deleted_default_categories"]){
        if(setting[key]!==undefined&&!Array.isArray(setting[key]))return false;
      }
      if(Array.isArray(setting.custom_categories)&&setting.custom_categories.some(c=>!obj(c)||!text(c.id)||!text(c.label)||!c.id.trim()||!c.label.trim()))return false;
      for(const key of ["category_order","deleted_default_categories"]){
        if(Array.isArray(setting[key])&&setting[key].some(c=>!text(c)))return false;
      }
      for(const key of ["departments_enabled","stats_to_today","site_data_visible"]){
        if(setting[key]!==undefined&&typeof setting[key]!=="boolean")return false;
      }
      if(setting.sort_mode!==undefined&&!text(setting.sort_mode))return false;
    }
    if(Array.isArray(snapshot.products)&&snapshot.products.some(row=>{
      if(!nutrition(row)||!text(row.name)||!row.name.trim())return true;
      if(row.display!==undefined){
        if(!obj(row.display)||!nutrition(row.display))return true;
        for(const k of ["kcal","protein","fat","carb","sugar","salt","fiber"]){
          if(row.display[k]!==undefined&&Number(row.display[k])!==Number(row[k]??row[k==="protein"?"proteins":k==="fat"?"fats":k==="carb"?"carbs":k==="sugar"?"sugars":k==="fiber"?"fibre":k]??0))return true;
        }
      }
      return false;
    }))return false;
    if(Array.isArray(snapshot.calculator)&&snapshot.calculator.some(row=>!nutrition(row)||!text(row.text??row.name??"")||!(row.text??row.name??"").trim()))return false;
    if(Array.isArray(snapshot.archive)&&snapshot.archive.some(row=>{
      if(!nutrition(row)||!text(row.text)||!row.text.trim()||!text(row.date)||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(row.date))return true;
      if(row.comment!==undefined&&!text(row.comment))return true;
      if(row.composition!==undefined&&(!Array.isArray(row.composition)||row.composition.some(r=>!nutrition(r)||!text(r.text??r.name??"")||!(r.text??r.name??"").trim())))return true;
      return false;
    }))return false;
    if(Array.isArray(snapshot.calculator_quick_presets)&&snapshot.calculator_quick_presets.some(p=>!obj(p)||!number(p.amount)))return false;
    return true;
  }

  function applyRemoteSnapshot(snapshot,revision,updatedAt){
    if(!validateSyncSnapshotV91(snapshot)){
      syncStatusMessage="Сервер повернув некоректні дані; локальні записи не змінено";
      syncConflict=true;renderSystemStatus();return false;
    }
    syncApplyingRemote=true;
    beginStorageTransaction("Отримання даних із сервера");
    try{
      const remoteProducts=Array.isArray(snapshot.products)?snapshot.products.map((p,i)=>normalizeProduct(p,i)):[];
      const remoteCalculator=Array.isArray(snapshot.calculator)?snapshot.calculator.map(normalizeCalculatorItem).filter(Boolean):[];
      const remoteArchive=Array.isArray(snapshot.archive)?snapshot.archive:[];
      const remoteGoal=normalizeDailyGoal(snapshot.daily_goal||{});
      const remoteProfile=normalizeProfile(snapshot.profile||{});
      const remotePresets=normalizeQuickPresets(snapshot.calculator_quick_presets||[]);
      const settings=snapshot.settings&&typeof snapshot.settings==="object"?snapshot.settings:{};

      safeStorageSet(PRODUCTS_KEY,JSON.stringify(remoteProducts),{critical:true});
      safeStorageSet(CALCULATOR_KEY,JSON.stringify(remoteCalculator),{critical:true});
      safeStorageSet(ARCHIVE_KEY,JSON.stringify(remoteArchive),{critical:true});
      safeStorageSet(DAILY_GOAL_KEY,JSON.stringify(remoteGoal),{critical:true});
      safeStorageSet(PROFILE_KEY,JSON.stringify(remoteProfile),{critical:true});
      safeStorageSet(CALC_QUICK_PRESETS_KEY,JSON.stringify(remotePresets),{critical:true});
      const draft=String(snapshot.calculator_draft||"");
      if(draft)safeStorageSet(CALCULATOR_DRAFT_KEY,draft,{critical:true});else safeStorageRemove(CALCULATOR_DRAFT_KEY);
      if(Array.isArray(settings.custom_categories))safeStorageSet(CUSTOM_CATEGORIES_KEY,JSON.stringify(settings.custom_categories),{critical:true});
      if(Array.isArray(settings.deleted_default_categories))safeStorageSet(DELETED_DEFAULT_CATEGORIES_KEY,JSON.stringify(settings.deleted_default_categories),{critical:true});
      if(Array.isArray(settings.category_order))safeStorageSet(CATEGORY_ORDER_KEY,JSON.stringify(settings.category_order),{critical:true});
      if(typeof settings.departments_enabled==="boolean")safeStorageSet(DEPARTMENTS_ENABLED_KEY,settings.departments_enabled?"1":"0",{critical:true});
      if(VALID_SORT_MODES.has(String(settings.sort_mode||"")))safeStorageSet(SORT_KEY,String(settings.sort_mode),{critical:true});
      if(settings.random_sort_seed===null||settings.random_sort_seed===undefined)safeStorageRemove(RANDOM_SORT_SEED_KEY);else safeStorageSet(RANDOM_SORT_SEED_KEY,String(settings.random_sort_seed),{critical:true});
      if(typeof settings.stats_to_today==="boolean")safeStorageSet(STATS_TO_TODAY_KEY,settings.stats_to_today?"1":"0",{critical:true});
      if(typeof settings.site_data_visible==="boolean")safeStorageSet(SITE_DATA_VISIBLE_KEY,settings.site_data_visible?"1":"0",{critical:true});
      if(settings.database_updated_at)safeStorageSet(DATABASE_UPDATED_KEY,String(settings.database_updated_at),{critical:true});else safeStorageRemove(DATABASE_UPDATED_KEY);
      safeStorageSet(SYNC_LOCAL_UPDATED_KEY,String(updatedAt||new Date().toISOString()),{critical:true});
      safeStorageSet(SYNC_REVISION_KEY,String(Math.max(0,Number(revision)||0)),{critical:true});
      safeStorageSet(SYNC_DIRTY_KEY,"0",{critical:true});
      if(updatedAt)safeStorageSet(SYNC_LAST_AT_KEY,String(updatedAt),{critical:true});

      if(!finishStorageTransaction()){
        syncStatusMessage="Не вистачає локального сховища";
        renderSystemStatus();
        reloadPrimaryStateFromStorage();
        return false;
      }
      syncConflict=false;syncStatusMessage="Синхронізовано";
    }catch(error){
      rollbackStorageTransaction();
      syncStatusMessage="Помилка застосування даних";renderSystemStatus();
      return false;
    }finally{syncApplyingRemote=false;}
    reloadPrimaryStateFromStorage();
    return true;
  }

  function showSyncConflict(message="На іншому пристрої є новіші дані."){
    syncConflict=true;
    syncStatusMessage="Потрібно вибрати версію";
    if(systemSyncNote)systemSyncNote.textContent=message;
    renderSystemStatus();
  }

  function shouldDeferAutomaticRemoteApply(){
    if(document.querySelector(".product-modal.active"))return true;
    const active=document.activeElement;
    return !!active&&(["INPUT","TEXTAREA","SELECT"].includes(active.tagName)||active.isContentEditable);
  }

  async function getRemoteSyncState(){return authApi("/sync/state");}

  async function pushLocalSync({force=false}={}){
    const snapshot=buildSyncSnapshot();
    // The browser can import a larger backup than Worker D1 sync accepts.
    // Reject locally with an explicit status rather than attempting a doomed upload.
    const snapshotBytes=new TextEncoder().encode(JSON.stringify(snapshot)).byteLength;
    if(snapshotBytes>6*1024*1024){
      syncStatusMessage="Обсяг даних перевищує 6 МБ. Локальне збереження працює; зробіть експорт резервної копії.";
      renderSystemStatus();return false;
    }
    const baseRevision=Number(localStorage.getItem(SYNC_REVISION_KEY)||0);
    const submittedFingerprint=syncFingerprint(snapshot);
    const changeMarker=localStorage.getItem(SYNC_LOCAL_UPDATED_KEY);
    try{
      const data=await authApi("/sync/state",{method:"POST",body:{snapshot,base_revision:baseRevision,force}});
      const changedDuringRequest=syncFingerprint(buildSyncSnapshot())!==submittedFingerprint
        || localStorage.getItem(SYNC_LOCAL_UPDATED_KEY)!==changeMarker;
      if(!setSyncMeta(data.revision,data.updated_at,{dirty:changedDuringRequest,status:changedDuringRequest?"Є локальні зміни":"Синхронізовано"}))return false;
      lastStateSnapshotFingerprint=submittedFingerprint;
      if(changedDuringRequest)scheduleAdminStateSync(1000);
      return true;
    }catch(error){
      if(error?.status===409){showSyncConflict(error?.message||"На іншому пристрої є новіші дані.");return false;}
      syncStatusMessage=error?.status===0?"Немає мережі":String(error?.message||"Помилка синхронізації").slice(0,160);
      renderSystemStatus();
      return false;
    }
  }

  async function syncStateNow({preferServer=false,forceLocal=false,silent=false}={}){
    if(syncInProgress||!authToken||!authUser||!appInitialized)return false;
    if(!navigator.onLine){syncStatusMessage="Немає мережі";renderSystemStatus();return false;}
    syncInProgress=true;syncStatusMessage="Синхронізація...";renderSystemStatus();
    try{
      const remote=await getRemoteSyncState();
      const remoteRevision=Number(remote.revision||0);
      const knownRevision=Number(localStorage.getItem(SYNC_REVISION_KEY)||0);
      const dirty=localStorage.getItem(SYNC_DIRTY_KEY)==="1";
      const local=buildSyncSnapshot();
      const localFingerprint=syncFingerprint(local);
      if(remote.snapshot&&!validateSyncSnapshotV91(remote.snapshot)){
        syncStatusMessage="Помилка структури серверних даних; локальні записи не змінено";
        syncConflict=true;renderSystemStatus();return false;
      }
      const remoteFingerprint=syncFingerprint(remote.snapshot);

      if(forceLocal)return await pushLocalSync({force:true});
      if(preferServer){
        if(remote.snapshot){return applyRemoteSnapshot(remote.snapshot,remoteRevision,remote.updated_at);}
        syncStatusMessage="На сервері ще немає даних";renderSystemStatus();return false;
      }
      if(!remote.snapshot)return await pushLocalSync({force:false});

      // Перше оновлення зі старої v60-v63: серверний snapshot мав revision=0.
      // Поточний пристрій піднімає його до версійної синхронізації без втрати локальних даних.
      if(knownRevision===0&&remoteRevision===0)return await pushLocalSync({force:false});

      if(localFingerprint===remoteFingerprint){
        if(!setSyncMeta(remoteRevision,remote.updated_at,{dirty:false,status:"Синхронізовано"}))return false;
        lastStateSnapshotFingerprint=localFingerprint;
        return true;
      }

      if(remoteRevision>knownRevision){
        if(dirty){showSyncConflict();return false;}
        if(shouldDeferAutomaticRemoteApply()){
          syncStatusMessage="Очікування завершення редагування";
          renderSystemStatus();
          scheduleAdminStateSync(1500);
          return false;
        }
        return applyRemoteSnapshot(remote.snapshot,remoteRevision,remote.updated_at);
      }
      if(remoteRevision===knownRevision){
        if(dirty)return await pushLocalSync({force:false});
        // Однакова ревізія, але різний вміст — не робимо тихого перезапису.
        showSyncConflict("Локальні й серверні дані відрізняються. Виберіть, яку версію залишити.");
        return false;
      }
      showSyncConflict("Серверна ревізія не збігається з локальною. Виберіть, яку версію залишити.");
      return false;
    }catch(error){
      syncStatusMessage=error?.status===0?"Немає мережі":String(error?.message||"Помилка синхронізації").slice(0,160);
      if(!silent&&error?.message)console.warn("Sync failed:",error);
      renderSystemStatus();
      return false;
    }finally{syncInProgress=false;renderSystemStatus();}
  }

  async function syncAdminStateSnapshot(){return syncStateNow({silent:true});}

  function scheduleAdminStateSync(delay=900){
    clearTimeout(stateSyncTimer);
    stateSyncTimer=setTimeout(()=>void syncAdminStateSnapshot(),Math.max(0,Number(delay)||0));
  }

  function localStorageUsage(){
    let chars=0;
    try{
      for(let i=0;i<localStorage.length;i++){
        const key=localStorage.key(i)||"";
        chars+=key.length+String(localStorage.getItem(key)||"").length;
      }
    }catch(_){}
    return chars*2;
  }

  const LOCAL_STORAGE_REFERENCE_LIMIT=5*1024*1024;

  function formatBytes(bytes){
    const value=Math.max(0,Number(bytes)||0);
    if(value<1024)return `${value} Б`;
    if(value<1024*1024)return `${(value/1024).toFixed(1)} КБ`;
    return `${(value/(1024*1024)).toFixed(2)} МБ`;
  }

  function renderSystemStatus(){
    if(systemVersion)systemVersion.textContent=SITE_VERSION;
    if(systemNetwork)systemNetwork.textContent=navigator.onLine?"Онлайн":"Офлайн";
    const storageBytes=localStorageUsage();
    const storagePercent=Math.min(100,(storageBytes/LOCAL_STORAGE_REFERENCE_LIMIT)*100);
    const storageDanger=Boolean(storageLastError)||storagePercent>=80;
    if(systemStorage)systemStorage.textContent=storageLastError||`${formatBytes(storageBytes)} / ≈5 МБ · ${storagePercent.toFixed(storagePercent<10?1:0)}%`;
    if(systemStorageCard)systemStorageCard.classList.toggle("system-status-danger",storageDanger);
    if(systemStorageNote)systemStorageNote.textContent=storageDanger?"Сховище майже заповнене — зробіть експорт і звільніть місце.":"Червоний стан вмикається від 80% орієнтовного ліміту.";
    if(systemUndo)systemUndo.textContent=`${loadUndoStack().length}/3`;
    if(systemSync)systemSync.textContent=syncStatusMessage;
    const syncAt=localStorage.getItem(SYNC_LAST_AT_KEY);
    if(systemSyncTime)systemSyncTime.textContent=syncAt?formatAdminDate(syncAt):"Ще не виконувалася";
    const lastExport=localStorage.getItem(LAST_EXPORT_KEY),lastImport=localStorage.getItem(LAST_IMPORT_KEY);
    if(systemExport)systemExport.textContent=lastExport?formatAdminDate(lastExport):"Ще не виконувався";
    if(systemImport)systemImport.textContent=lastImport?formatAdminDate(lastImport):"Ще не виконувався";
    if(syncUseServer)syncUseServer.hidden=!syncConflict;
    if(syncUseLocal)syncUseLocal.hidden=!syncConflict;
    if(systemSyncNote&&!syncConflict)systemSyncNote.textContent="Автосинхронізація захищена ревізіями: старіший пристрій не перезапише новіші дані без підтвердження.";
  }

  async function refreshSystemStatus({checkWorker=true}={}){
    renderSystemStatus();
    if(!checkWorker||!systemWorker)return;
    systemWorker.textContent="Перевірка...";
    if(!navigator.onLine){systemWorker.textContent="Немає мережі";return;}
    try{
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),5000);
      const response=await fetch(`${AUTH_API_URL}/health`,{cache:"no-store",signal:controller.signal});
      clearTimeout(timer);
      const data=await response.json().catch(()=>({}));
      systemWorker.textContent=response.ok?`Доступний · v${data.version??"?"}`:"Помилка";
    }catch(_){systemWorker.textContent="Недоступний";}
  }

  function scheduleExternalReload(){
    clearTimeout(externalReloadTimer);
    externalReloadTimer=setTimeout(()=>{
      if(document.querySelector(".product-modal.active")){scheduleExternalReload();return;}
      reloadPrimaryStateFromStorage();
      syncStatusMessage=localStorage.getItem(SYNC_DIRTY_KEY)==="1"?"Є локальні зміни":"Синхронізовано";
      renderSystemStatus();
    },250);
  }

  function logAction(message,metadata=null){
    const time=new Date().toISOString();
    const text=String(message ?? "Невідома дія");
    consoleItems.push({id:createId("console"),time,message:text});
    saveConsoleLocal();
    renderConsole();
    queueAuditAction(text,time,"site_action",metadata);
  }
  function renderConsole(){
    if(!consoleLog)return; consoleLog.innerHTML="";
    if(!consoleItems.length){consoleLog.innerHTML='<div class="console-entry">Журнал дій порожній.</div>';return;}
    [...consoleItems].reverse().forEach(item=>{
      const row=document.createElement("div");row.className="console-entry";
      const dt=item.time?new Date(item.time):new Date();row.textContent=`[${formatConsoleDate(dt)}] ${item.message}`;consoleLog.append(row);
    });
  }

  function undoStorageValue(key){const value=localStorage.getItem(key);return value===null?null:value;}
  function loadUndoStack(){
    try{
      const parsed=JSON.parse(localStorage.getItem(UNDO_KEY)||"null");
      if(Array.isArray(parsed))return parsed.filter(item=>item&&typeof item==="object").slice(-3);
      if(parsed&&typeof parsed==="object")return [parsed];
    }catch(_){}
    return [];
  }
  function saveUndoStack(stack){
    let normalized=(Array.isArray(stack)?stack:[]).filter(item=>item&&typeof item==="object").slice(-3);
    if(!normalized.length){safeStorageRemove(UNDO_KEY);renderSystemStatus();return;}
    // Намагаймося зберегти 3 кроки. Якщо сховище замале, відкидаємо найстаріший
    // Undo, але не ризикуємо основними КБЖВ-даними.
    while(normalized.length){
      if(safeStorageSet(UNDO_KEY,JSON.stringify(normalized),{critical:false})){renderSystemStatus();return;}
      normalized=normalized.slice(1);
    }
    safeStorageRemove(UNDO_KEY);
    storageLastError="Для захисту основних даних історію скасувань не збережено через нестачу місця.";
    renderSystemStatus();
  }
  function saveUndoSnapshot(description){
    const snapshot={
      description:String(description||"Остання дія"),
      createdAt:new Date().toISOString(),
      products:JSON.parse(JSON.stringify(products)),
      calculatorItems:JSON.parse(JSON.stringify(calculatorItems)),
      archiveItems:JSON.parse(JSON.stringify(archiveItems)),
      dailyGoal:JSON.parse(JSON.stringify(dailyGoal)),
      calcDraft:calcInput?calcInput.value:undoStorageValue(CALCULATOR_DRAFT_KEY),
      sort:currentSort,
      randomSortSeed:undoStorageValue(RANDOM_SORT_SEED_KEY),
      categoryOrder:undoStorageValue(CATEGORY_ORDER_KEY),
      customCategories:undoStorageValue(CUSTOM_CATEGORIES_KEY),
      deletedDefaultCategories:undoStorageValue(DELETED_DEFAULT_CATEGORIES_KEY),
      departmentsEnabled:undoStorageValue(DEPARTMENTS_ENABLED_KEY),
      statsToToday:undoStorageValue(STATS_TO_TODAY_KEY),
      profile:undoStorageValue(PROFILE_KEY),
      calculatorQuickPresets:undoStorageValue(CALC_QUICK_PRESETS_KEY),
      meta:{
        databaseUpdated:undoStorageValue(DATABASE_UPDATED_KEY),
        exportVersion:undoStorageValue(EXPORT_VERSION_KEY),
        exportFingerprint:undoStorageValue(EXPORT_FINGERPRINT_KEY)
      }
    };
    const stack=loadUndoStack();
    stack.push(snapshot);
    saveUndoStack(stack);
  }
  function restoreStorageValue(key,value){if(value===null||value===undefined)safeStorageRemove(key);else safeStorageSet(key,String(value),{critical:true});}
  function applyUndoSnapshot(){
    const stack=loadUndoStack();
    const snapshot=stack.pop()||null;
    if(!snapshot){showButtonState(undoLastAction,"Немає дії","error",1500);logAction("Скасування не виконано: немає дії для скасування.");return;}
    beginStorageTransaction("Скасування дії");
    try{
      const nextProducts=Array.isArray(snapshot.products)?snapshot.products.map((p,i)=>normalizeProduct(p,i)):products;
      const nextCalculator=Array.isArray(snapshot.calculatorItems)?snapshot.calculatorItems:calculatorItems;
      const nextArchive=Array.isArray(snapshot.archiveItems)?snapshot.archiveItems:archiveItems;
      const nextGoal=snapshot.dailyGoal&&typeof snapshot.dailyGoal==="object"?{...dailyGoal,...snapshot.dailyGoal}:dailyGoal;
      const nextSort=snapshot.sort||"categories";
      safeStorageSet(PRODUCTS_KEY,JSON.stringify(nextProducts),{critical:true});
      safeStorageSet(CALCULATOR_KEY,JSON.stringify(nextCalculator),{critical:true});
      safeStorageSet(ARCHIVE_KEY,JSON.stringify(nextArchive),{critical:true});
      safeStorageSet(DAILY_GOAL_KEY,JSON.stringify(nextGoal),{critical:true});
      safeStorageSet(SORT_KEY,nextSort,{critical:true});
      restoreStorageValue(RANDOM_SORT_SEED_KEY,snapshot.randomSortSeed);
      restoreStorageValue(CATEGORY_ORDER_KEY,snapshot.categoryOrder);
      restoreStorageValue(CUSTOM_CATEGORIES_KEY,snapshot.customCategories);
      if(Object.prototype.hasOwnProperty.call(snapshot,"deletedDefaultCategories"))restoreStorageValue(DELETED_DEFAULT_CATEGORIES_KEY,snapshot.deletedDefaultCategories);
      restoreStorageValue(DEPARTMENTS_ENABLED_KEY,snapshot.departmentsEnabled);
      if(Object.prototype.hasOwnProperty.call(snapshot,"statsToToday"))restoreStorageValue(STATS_TO_TODAY_KEY,snapshot.statsToToday);
      restoreStorageValue(PROFILE_KEY,snapshot.profile);
      if(Object.prototype.hasOwnProperty.call(snapshot,"calculatorQuickPresets"))restoreStorageValue(CALC_QUICK_PRESETS_KEY,snapshot.calculatorQuickPresets);
      if(snapshot.calcDraft)safeStorageSet(CALCULATOR_DRAFT_KEY,snapshot.calcDraft,{critical:true});else safeStorageRemove(CALCULATOR_DRAFT_KEY);
      const meta=snapshot.meta||{};
      restoreStorageValue(DATABASE_UPDATED_KEY,meta.databaseUpdated);
      restoreStorageValue(EXPORT_VERSION_KEY,meta.exportVersion);
      restoreStorageValue(EXPORT_FINGERPRINT_KEY,meta.exportFingerprint);
      saveUndoStack(stack);
      markLocalDataChanged();
      if(!finishStorageTransaction()){
        reloadPrimaryStateFromStorage();
        showButtonState(undoLastAction,"Не скасовано","error",1500);
        alert("Не вистачає місця для безпечного скасування. Дані залишено без змін.");
        return;
      }
      products=nextProducts;calculatorItems=nextCalculator;archiveItems=nextArchive;dailyGoal=nextGoal;currentSort=nextSort;
      departmentsEnabled=localStorage.getItem(DEPARTMENTS_ENABLED_KEY)!=="0";
      statsToTodayEnabled=localStorage.getItem(STATS_TO_TODAY_KEY)==="1";
      populateProductCategorySelects();loadProfile();loadCalculatorQuickPresets();
      if(calcInput)calcInput.value=snapshot.calcDraft||"";
      for(const key of Object.keys(goalInputs))if(goalInputs[key])goalInputs[key].value=dailyGoal[key]||"";
      updateSortOptionState();syncStatsToToday(false);renderProducts(searchInput?.value||"");renderCalculatorLog();updateTotals();renderDailyGoal();renderArchive();renderStatistics();updateSiteDataCounts();
      showButtonState(undoLastAction,`Повернуто (${stack.length}/3)`,"success",1500);
      logAction(`Скасовано дію «${snapshot.description||"Остання дія"}».`);
    }catch(error){
      rollbackStorageTransaction();reloadPrimaryStateFromStorage();showButtonState(undoLastAction,"Помилка","error");
      alert("Не вдалося безпечно скасувати дію. Попередні дані збережено.");
    }
  }

  function createId(prefix="id") { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,9)}`; }
  function number(value) { const n=Number(typeof value==="string"?value.trim().replace(",","."):value); return Number.isFinite(n)?n:0; }
  function round(value,decimals=1) { const f=10**decimals; return Math.round((number(value)+Number.EPSILON)*f)/f; }
  function dayCountWord(count){
    const n=Math.abs(Math.trunc(Number(count)||0)), last=n%10, tail=n%100;
    return tail>=11&&tail<=14?"днів":last===1?"день":last>=2&&last<=4?"дні":"днів";
  }
  function formatNumber(value) {
    const n=number(value);
    const rounded=Math.round((n+Number.EPSILON)*1000)/1000;
    return String(Object.is(rounded,-0)?0:rounded);
  }
  function normalizeDisplayNumber(value,fallback){
    const raw=String(value??"").trim().replace(",",".");
    if(/^\d+(?:\.\d{1,3})?$/.test(raw) && Number(raw)===Number(fallback))return raw;
    return formatNumber(fallback);
  }
  function productDisplayNumber(product,key){
    return normalizeDisplayNumber(product?.display?.[key],product?.[key]);
  }
  function getInitials(name) {
    const words=String(name||"").trim().split(/\s+/).filter(Boolean);
    if (!words.length) return "?";
    return words.length===1?words[0].slice(0,2).toUpperCase():(words[0][0]+words[1][0]).toUpperCase();
  }
  function normalizeQuickWeights(values){
    const result=[];
    (Array.isArray(values)?values:[]).forEach(value=>{
      const weight=number(value);
      if(weight<=0)return;
      if(result.some(existing=>Math.abs(existing-weight)<1e-9))return;
      result.push(weight);
    });
    return result.slice(0,4);
  }
  function readQuickWeightInputs(inputs){
    return normalizeQuickWeights((inputs||[]).map(input=>input?.value));
  }
  function fillQuickWeightInputs(inputs,values){
    const normalized=normalizeQuickWeights(values);
    (inputs||[]).forEach((input,index)=>{if(input)input.value=normalized[index]===undefined?"":formatNumber(normalized[index]);});
  }

  function normalizeProduct(product,index=0) {
    const kcal=backupNumber(product.kcal);
    const protein=backupNumber(product.protein ?? product.proteins);
    const fat=backupNumber(product.fat ?? product.fats);
    const carb=backupNumber(product.carb ?? product.carbs);
    const sugar=backupNumber(product.sugar ?? product.sugars);
    const salt=backupNumber(product.salt);
    const fiber=backupNumber(product.fiber ?? product.fibre);
    const incomingDisplay=product.display&&typeof product.display==="object"?product.display:{};
    return {
      id:String(product.id ?? createId("product")),
      name:String(product.name ?? "").trim(),
      kcal,
      kcal_no_data:Boolean(product.kcal_no_data ?? product.no_data?.kcal),
      protein,
      protein_no_data:Boolean(product.protein_no_data ?? product.no_data?.protein),
      fat,
      fat_no_data:Boolean(product.fat_no_data ?? product.no_data?.fat),
      carb,
      carb_no_data:Boolean(product.carb_no_data ?? product.no_data?.carb),
      sugar,
      sugar_no_data:Boolean(product.sugar_no_data ?? product.no_data?.sugar),
      salt,
      salt_no_data:Boolean(product.salt_no_data ?? product.no_data?.salt),
      fiber,
      fiber_no_data:Boolean(product.fiber_no_data ?? product.no_data?.fiber),
      display:{
        kcal:normalizeDisplayNumber(incomingDisplay.kcal ?? product.kcal,kcal),
        protein:normalizeDisplayNumber(incomingDisplay.protein ?? product.protein ?? product.proteins,protein),
        fat:normalizeDisplayNumber(incomingDisplay.fat ?? product.fat ?? product.fats,fat),
        carb:normalizeDisplayNumber(incomingDisplay.carb ?? product.carb ?? product.carbs,carb),
        sugar:normalizeDisplayNumber(incomingDisplay.sugar ?? product.sugar ?? product.sugars,sugar),
        salt:normalizeDisplayNumber(incomingDisplay.salt ?? product.salt,salt),
        fiber:normalizeDisplayNumber(incomingDisplay.fiber ?? product.fiber ?? product.fibre,fiber)
      },
      unit:product.unit==="мл"?"мл":"г",
      category:String(product.category ?? product.category_id ?? "").trim(),
      quick_weights:normalizeQuickWeights(product.quick_weights ?? product.quickWeights ?? []),
      full_name:String(product.full_name ?? product.description ?? "").trim(),
      full_name_no_data:Boolean(product.full_name_no_data ?? product.description_no_data ?? product.no_data?.full_name),
      created_at:String(product.created_at || new Date(2000,0,1,0,0,index).toISOString())
    };
  }
  function loadArray(key) {
    try { const p=JSON.parse(localStorage.getItem(key)||"[]"); return Array.isArray(p)?p:[]; } catch { return []; }
  }
  function storageWriteFailed(){
    // Only roll back live application state when there is no enclosing import/sync transaction.
    if(!storageTransaction)reloadPrimaryStateFromStorage();
    return false;
  }
  function saveProductsLocal(){
    const ok=persistUserChange("Збереження продуктів",()=>{
      const dataOk=safeStorageSet(PRODUCTS_KEY,JSON.stringify(products),{critical:true});
      const dateOk=dataOk&&safeStorageSet(DATABASE_UPDATED_KEY,new Date().toISOString(),{critical:true});
      return dataOk&&dateOk;
    });
    if(ok)updateSiteDataCounts();
    return ok;
  }
  function saveCalculatorLocal(){
    return persistUserChange("Збереження калькулятора",()=>safeStorageSet(CALCULATOR_KEY,JSON.stringify(calculatorItems),{critical:true}));
  }
  function saveArchiveLocal(){
    return persistUserChange("Збереження архіву",()=>safeStorageSet(ARCHIVE_KEY,JSON.stringify(archiveItems),{critical:true}));
  }
  function saveCalculatorDraft(){
    return !calcInput||persistUserChange("Збереження чернетки",()=>safeStorageSet(CALCULATOR_DRAFT_KEY,calcInput.value,{critical:true}));
  }
  function renderSiteDataVisibility(){
    if(siteDataSection)siteDataSection.hidden=!siteDataVisible;
    if(siteDataContent)siteDataContent.hidden=false;
    if(siteDataToggle){
      siteDataToggle.textContent=siteDataVisible?"Сховати поточні дані сайту":"Показати поточні дані сайту";
      siteDataToggle.dataset.originalText=siteDataToggle.textContent;
      siteDataToggle.setAttribute("aria-expanded",siteDataVisible?"true":"false");
    }
  }
  function updateSiteDataCounts(){
    renderSiteDataVisibility();
    if(siteProductsCount)siteProductsCount.textContent=String(products.length);
    if(siteArchiveCount)siteArchiveCount.textContent=String(archiveItems.length);
    if(siteDatabaseUpdated){
      const raw=localStorage.getItem(DATABASE_UPDATED_KEY);
      if(!raw){siteDatabaseUpdated.textContent="Ще не оновлювалася";}
      else{const d=new Date(raw);siteDatabaseUpdated.textContent=`${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()} о ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;}
    }
    if(siteLastExport){
      const raw=localStorage.getItem(LAST_EXPORT_KEY);
      if(!raw)siteLastExport.textContent="Ще не виконувався";
      else{
        const then=new Date(raw),now=new Date();
        const startThen=new Date(then.getFullYear(),then.getMonth(),then.getDate());
        const startNow=new Date(now.getFullYear(),now.getMonth(),now.getDate());
        const days=Math.max(0,Math.round((startNow-startThen)/86400000));
        siteLastExport.textContent=days===0?"сьогодні":days===1?"1 день тому":`${days} ${dayCountWord(days)} тому`;
      }
    }
    if(siteLastImport){
      const raw=localStorage.getItem(LAST_IMPORT_KEY);
      if(!raw)siteLastImport.textContent="Ще не виконувався";
      else{
        const then=new Date(raw),now=new Date();
        const startThen=new Date(then.getFullYear(),then.getMonth(),then.getDate());
        const startNow=new Date(now.getFullYear(),now.getMonth(),now.getDate());
        const days=Math.max(0,Math.round((startNow-startThen)/86400000));
        siteLastImport.textContent=days===0?"сьогодні":days===1?"1 день тому":`${days} ${dayCountWord(days)} тому`;
      }
    }
    if(siteCurrentDate){const d=new Date();siteCurrentDate.textContent=`${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}`;}
    renderSystemStatus();
  }
  function compactFingerprint(value){
    const text=typeof value==="string"?value:JSON.stringify(value);
    let h1=2166136261,h2=2246822519;
    for(let i=0;i<text.length;i++){
      const c=text.charCodeAt(i);
      h1=Math.imul(h1^c,16777619);
      h2=Math.imul(h2^c,3266489917);
    }
    return `fp2:${text.length}:${(h1>>>0).toString(16)}:${(h2>>>0).toString(16)}`;
  }
  function exportFingerprint(){
    return compactFingerprint({
      products:products.map((p,i)=>normalizeProduct(p,i)),
      calculator:calculatorItems.map(item=>normalizeCalculatorItem(item)),
      calculator_draft:String(calcInput?.value??localStorage.getItem(CALCULATOR_DRAFT_KEY)??""),
      archive:archiveItems,
      daily_goal:normalizeDailyGoal(dailyGoal),
      category_order:getCategoryOrder(),
      custom_categories:getCustomCategories().map(({id,label})=>({id,label})),
      deleted_default_categories:getDeletedDefaultCategoryIds(),
      departments_enabled:departmentsEnabled,
      sort_mode:currentSort,
      random_sort_seed:localStorage.getItem(RANDOM_SORT_SEED_KEY),
      active_tab:localStorage.getItem(ACTIVE_TAB_KEY)||"blocks",
      stats_to_today:localStorage.getItem(STATS_TO_TODAY_KEY)==="1",
      site_data_visible:localStorage.getItem(SITE_DATA_VISIBLE_KEY)!=="0",
      profile:normalizeProfile(profileData),
      calculator_quick_presets:normalizeQuickPresets(calculatorQuickPresets)
    });
  }
  function legacyExportFingerprintV68(){
    return JSON.stringify({
      products:products.map((p,i)=>normalizeProduct(p,i)),
      calculator:calculatorItems.map(item=>normalizeCalculatorItem(item)),
      calculator_draft:String(calcInput?.value??localStorage.getItem(CALCULATOR_DRAFT_KEY)??""),
      archive:archiveItems,
      daily_goal:normalizeDailyGoal(dailyGoal),
      category_order:getCategoryOrder(),
      custom_categories:getCustomCategories().map(({id,label})=>({id,label})),
      deleted_default_categories:getDeletedDefaultCategoryIds(),
      departments_enabled:departmentsEnabled,
      sort_mode:currentSort,
      stats_to_today:localStorage.getItem(STATS_TO_TODAY_KEY)==="1",
      profile:normalizeProfile(profileData),
      calculator_quick_presets:normalizeQuickPresets(calculatorQuickPresets)
    });
  }
  function storedExportFingerprint(){
    const previous=localStorage.getItem(EXPORT_FINGERPRINT_KEY);
    if(previous&&!previous.startsWith("fp2:")&&previous===legacyExportFingerprintV68()){
      const compact=exportFingerprint();
      safeStorageSet(EXPORT_FINGERPRINT_KEY,compact);
      return compact;
    }
    return previous;
  }
  function getExportVersion(){
    const fingerprint=exportFingerprint();
    const previous=storedExportFingerprint();
    let version=Math.max(0,parseInt(localStorage.getItem(EXPORT_VERSION_KEY)||"0",10)||0);
    if(previous!==fingerprint){version+=1;safeStorageSet(EXPORT_VERSION_KEY,String(version));safeStorageSet(EXPORT_FINGERPRINT_KEY,fingerprint);}
    if(version<1){version=1;safeStorageSet(EXPORT_VERSION_KEY,"1");safeStorageSet(EXPORT_FINGERPRINT_KEY,fingerprint);}
    return version;
  }
  function productNameCompare(a,b){
    return String(a?.name||"").localeCompare(String(b?.name||""),"uk",{sensitivity:"base",numeric:true});
  }
  function stableRandomValue(product,seed){
    const text=`${String(product?.id||product?.name||"")}|${seed}`;
    let hash=2166136261;
    for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}
    return hash>>>0;
  }
  function getSortedProducts() {
    const arr=[...products];
    if(currentSort==="oldest")arr.sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
    else if(currentSort==="newest")arr.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
    else if(currentSort==="list")arr.sort(productNameCompare);
    else if(currentSort==="random"){
      const seed=localStorage.getItem(RANDOM_SORT_SEED_KEY)||"0";
      arr.sort((a,b)=>stableRandomValue(a,seed)-stableRandomValue(b,seed));
    }else if(currentSort==="categories"&&departmentsEnabled){
      const orderIndex=new Map(getCategoryOrder().map((id,index)=>[id,index]));
      arr.sort((a,b)=>{
        const ca=orderIndex.get(getProductCategory(a).id)??9999;
        const cb=orderIndex.get(getProductCategory(b).id)??9999;
        return ca-cb||productNameCompare(a,b);
      });
    }
    // "initial" and "manual" preserve the current database order.
    return arr;
  }

  const PRODUCT_CATEGORIES=[
    {
      id:"frozen",label:"Заморожені продукти",
      aliases:["заморожені продукти","заморожені","заморозка","frozen"],
      patterns:[/заморож/i,/\bfrozen\b/i]
    },
    {
      id:"eggs",label:"Яйця",
      aliases:["яйця","яєчні продукти"],
      patterns:[/яйц/i,/\begg(s)?\b/i]
    },
    {
      id:"dairy",label:"Молочні продукти",
      aliases:["молочні продукти","молочні","молочка"],
      patterns:[/молок/i,/кефір/i,/йогурт/i,/сметан/i,/вершк/i,/ряжанк/i,/творог/i,/(^|\s)сир(\s|$|[,.:;])/i,/моцарел/i,/пармезан/i,/бринз/i,/\bmilk\b/i,/\byogurt\b/i,/\byoghurt\b/i,/\bcheese\b/i,/\bkefir\b/i]
    },
    {
      id:"meat",label:"М’ясо та птиця",
      aliases:["м’ясо та птиця","мясо та птиця","м’ясо","мясо","птиця"],
      patterns:[/кур(ка|яч|ин)/i,/індич/i,/ялович/i,/теляч/i,/свинин/i,/м.?яс/i,/фарш/i,/ковбас/i,/шинка/i,/бекон/i,/салям/i,/сосиск/i,/кролик/i,/\bchicken\b/i,/\bturkey\b/i,/\bbeef\b/i,/\bpork\b/i]
    },
    {
      id:"fish",label:"Риба та морепродукти",
      aliases:["риба та морепродукти","риба","морепродукти"],
      patterns:[/риб/i,/лосос/i,/форел/i,/тун(ець|ця)/i,/скумбр/i,/оселед/i,/кревет/i,/кальмар/i,/міді/i,/морепродукт/i,/\bsalmon\b/i,/\btuna\b/i,/\btrout\b/i,/\bshrimp\b/i,/\bfish\b/i]
    },
    {
      id:"grains",label:"Крупи, макарони та бобові",
      aliases:["крупи, макарони та бобові","крупи","каші","каша","макарони","бобові"],
      patterns:[/рис/i,/вівсян/i,/овсян/i,/греч/i,/булгур/i,/кус.?кус/i,/кіноа/i,/круп/i,/каш/i,/макарон/i,/спагет/i,/локшин/i,/паст(а|и)(\s|$)/i,/сочевиц/i,/квасол/i,/нут(\s|$|[,.:;])/i,/горох/i,/\boats?\b/i,/\brice\b/i,/\bpasta\b/i,/\bquinoa\b/i]
    },
    {
      id:"bakery",label:"Хліб та випічка",
      aliases:["хліб та випічка","хліб","випічка"],
      patterns:[/хліб/i,/лаваш/i,/булоч/i,/багет/i,/тостов/i,/круасан/i,/випіч/i,/борошн/i,/тортил/i,/\bbread\b/i,/\bflour\b/i]
    },
    {
      id:"vegetables",label:"Овочі, зелень та гриби",
      aliases:["овочі, зелень та гриби","овочі","зелень","гриби"],
      patterns:[/картопл/i,/моркв/i,/огір/i,/помід/i,/томат(\s|$|[,.:;])/i,/цибул/i,/часник/i,/брокол/i,/капуст/i,/буряк/i,/кабач/i,/баклаж/i,/болгарськ.*перець/i,/перець.*болгарськ/i,/селера/i,/шпинат/i,/рукол/i,/зелень/i,/гриб/i,/печериц/i,/кукурудз/i,/\bpotato\b/i,/\btomato\b/i,/\bcucumber\b/i]
    },
    {
      id:"fruits",label:"Фрукти та ягоди",
      aliases:["фрукти та ягоди","фрукти","ягоди"],
      patterns:[/банан/i,/яблук/i,/ківі/i,/апельсин/i,/мандарин/i,/лимон/i,/груш/i,/виноград/i,/персик/i,/нектарин/i,/ананас/i,/манго/i,/авокад/i,/лохин/i,/чорниц/i,/полуниц/i,/малин/i,/смородин/i,/вишн/i,/черешн/i,/ягод/i,/\bbanana\b/i,/\bapple\b/i,/\bkiwi\b/i,/\bberry\b/i]
    },
    {
      id:"nuts",label:"Горіхи, насіння та сухофрукти",
      aliases:["горіхи, насіння та сухофрукти","горіхи","насіння","сухофрукти"],
      patterns:[/горіх/i,/мигдал/i,/кеш.?ю/i,/пекан/i,/фісташ/i,/арахіс/i,/насін/i,/кунжут/i,/родзин/i,/кураг/i,/фінік/i,/сухофрукт/i,/\bnut(s)?\b/i,/\balmond/i,/\bseed(s)?\b/i]
    },
    {
      id:"condiments",label:"Соуси, олії та приправи",
      aliases:["соуси, олії та приправи","соуси","олії","приправи","спеції"],
      patterns:[/соус/i,/кетчуп/i,/майонез/i,/гірчиц/i,/олія/i,/масло олив/i,/оливков.*масло/i,/паприк/i,/спеці/i,/приправа/i,/імбир/i,/кориц/i,/сіль(\s|$|[,.:;])/i,/перець(\s|$|[,.:;])/i,/чилі/i,/\bsauce\b/i,/\boil\b/i,/\bspice/i]
    },
    {
      id:"sports",label:"Спортивне харчування",
      aliases:["спортивне харчування","спортхарчування","спортпіт"],
      patterns:[/протеїн/i,/гейнер/i,/ізолят/i,/whey/i,/protein powder/i,/mass gainer/i]
    },
    {
      id:"sweets",label:"Солодощі та снеки",
      aliases:["солодощі та снеки","солодощі","снеки"],
      patterns:[/шоколад/i,/цукерк/i,/печив/i,/вафл/i,/батончик/i,/чіпс/i,/снек/i,/морозиво/i,/десерт/i,/мармелад/i,/зефір/i,/мед(\s|$|[,.:;])/i,/\bchocolate\b/i,/\bcandy\b/i,/\bcookie/i,/\bchips\b/i]
    },
    {
      id:"ready",label:"Готові страви",
      aliases:["готові страви","готова їжа","готові продукти"],
      patterns:[/піца/i,/бургер/i,/сендвіч/i,/бутерброд/i,/вареник/i,/пельмен/i,/суші/i,/рол(и|\s|$)/i,/шаурм/i,/готова страва/i,/готовий обід/i,/\bpizza\b/i,/\bburger\b/i,/\bsushi\b/i]
    },
    {
      id:"drinks",label:"Напої",
      aliases:["напої","газіровки","газировка","газовані напої","енергетики"],
      patterns:[/red bull/i,/ред бул/i,/coca.?cola/i,/кока.?кол/i,/pepsi/i,/пепсі/i,/sprite/i,/спрайт/i,/fanta/i,/фанта/i,/газован/i,/енергетик/i,/напій/i,/напиток/i,/вода(\s|$|[,.:;])/i,/сік(\s|$|[,.:;])/i,/кава/i,/coffee/i,/чай(\s|$|[,.:;])/i,/juice/i]
    },
    {
      id:"other",label:"Інше",
      aliases:["інше","інші продукти"],
      patterns:[]
    }
  ];

  function normalizeCustomCategoryItem(item){
    if(!item||typeof item!=="object")return null;
    const id=String(item.id||"").trim();
    const label=String(item.label||"").trim().slice(0,40);
    if(!id.startsWith("custom-")||!label)return null;
    return {id,label,aliases:[label],patterns:[],custom:true};
  }

  function getCustomCategories(){
    try{
      const raw=JSON.parse(localStorage.getItem(CUSTOM_CATEGORIES_KEY)||"[]");
      if(!Array.isArray(raw))return [];
      const seen=new Set();
      return raw.map(normalizeCustomCategoryItem).filter(item=>{
        if(!item||seen.has(item.id))return false;
        seen.add(item.id);return true;
      });
    }catch(_){return [];}
  }

  function saveCustomCategories(items){
    const normalized=(Array.isArray(items)?items:[]).map(normalizeCustomCategoryItem).filter(Boolean);
    return persistUserChange("Збереження власних відділів",()=>safeStorageSet(CUSTOM_CATEGORIES_KEY,JSON.stringify(normalized.map(({id,label})=>({id,label}))),{critical:true}));
  }

  function getDeletedDefaultCategoryIds(){
    try{
      const raw=JSON.parse(localStorage.getItem(DELETED_DEFAULT_CATEGORIES_KEY)||"[]");
      if(!Array.isArray(raw))return [];
      const valid=new Set(PRODUCT_CATEGORIES.map(category=>category.id));
      return [...new Set(raw.map(id=>String(id||"")).filter(id=>valid.has(id)))];
    }catch(_){return [];}
  }

  function saveDeletedDefaultCategoryIds(ids){
    const valid=new Set(PRODUCT_CATEGORIES.map(category=>category.id));
    const normalized=[...new Set((Array.isArray(ids)?ids:[]).map(id=>String(id||"")).filter(id=>valid.has(id)))];
    return persistUserChange("Збереження прихованих відділів",()=>safeStorageSet(DELETED_DEFAULT_CATEGORIES_KEY,JSON.stringify(normalized),{critical:true}));
  }

  function getAllCategories(){
    const deleted=new Set(getDeletedDefaultCategoryIds());
    return [...PRODUCT_CATEGORIES.filter(category=>!deleted.has(category.id)),...getCustomCategories()];
  }

  function createCustomCategoryId(){
    return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
  }

  function populateProductCategorySelects(){
    [newProductCategory,editProductCategory].forEach((select,index)=>{
      if(!select)return;
      select.innerHTML="";
      if(index===0){
        const placeholder=document.createElement("option");
        placeholder.value="";
        placeholder.textContent="Оберіть відділ...";
        placeholder.disabled=true;
        placeholder.selected=true;
        select.append(placeholder);
      }
      getAllCategories().forEach(category=>{
        const option=document.createElement("option");
        option.value=category.id;
        option.textContent=category.label;
        select.append(option);
      });
    });
  }
  populateProductCategorySelects();

  function defaultCategoryOrder(){
    return getAllCategories().map(category=>category.id);
  }
  function normalizeCategoryOrder(value){
    const valid=new Set(defaultCategoryOrder());
    const raw=Array.isArray(value)?value:[];
    const seen=new Set();
    const result=[];
    raw.forEach(id=>{
      const key=String(id||"");
      if(valid.has(key)&&!seen.has(key)){seen.add(key);result.push(key);}
    });
    defaultCategoryOrder().forEach(id=>{
      if(!seen.has(id)){seen.add(id);result.push(id);}
    });
    return result;
  }
  function getCategoryOrder(){
    try{
      const parsed=JSON.parse(localStorage.getItem(CATEGORY_ORDER_KEY)||"[]");
      return normalizeCategoryOrder(parsed);
    }catch(_){
      return defaultCategoryOrder();
    }
  }
  function saveCategoryOrder(order){
    return persistUserChange("Збереження порядку відділів",()=>safeStorageSet(CATEGORY_ORDER_KEY,JSON.stringify(normalizeCategoryOrder(order)),{critical:true}));
  }
  function getOrderedCategories(){
    const byId=new Map(getAllCategories().map(category=>[category.id,category]));
    return getCategoryOrder().map(id=>byId.get(id)).filter(Boolean);
  }

  function normalizeCategorySearch(value){
    return String(value||"").toLowerCase().replace(/[’'`]/g,"").replace(/\s+/g," ").trim();
  }
  function getProductCategory(product){
    const allCategories=getAllCategories();
    const explicit=allCategories.find(category=>category.id===String(product?.category||"").trim());
    if(explicit)return explicit;
    const activeIds=new Set(allCategories.map(category=>category.id));
    const text=normalizeCategorySearch(`${product?.name||""} ${product?.full_name||""}`);
    const classified=PRODUCT_CATEGORIES.find(category=>activeIds.has(category.id)&&category.id!=="other"&&category.patterns.some(pattern=>pattern.test(text)));
    if(classified)return classified;
    const other=allCategories.find(category=>category.id==="other");
    if(other)return other;
    return {id:"__uncategorized__",label:"",aliases:[],patterns:[],synthetic:true};
  }
  function categoryMatchesSearch(category,query){
    if(!query)return false;
    const q=normalizeCategorySearch(query);
    return [category.label,...category.aliases].some(value=>{
      const v=normalizeCategorySearch(value);
      return v===q||v.includes(q);
    });
  }
  function categoryExactSearch(category,query){
    if(!query)return false;
    const q=normalizeCategorySearch(query);
    return [category.label,...category.aliases].some(value=>normalizeCategorySearch(value)===q);
  }
  function createCategorySeparator(category,count){
    const separator=document.createElement("div");
    separator.className="product-category-separator";
    separator.dataset.category=category.id;
    const label=document.createElement("span");
    label.textContent=category.label;
    const amount=document.createElement("small");
    amount.textContent=String(count);
    separator.append(label,amount);
    return separator;
  }

  tabs.forEach(tab=>tab.addEventListener("click",()=>{
    const target=tab.dataset.tab;
    const tabLabel=tab.textContent.trim().replace(/:$/," ").trim();
    activateAppPage(target,{label:tabLabel});
  }));
  utilitiesOpen?.addEventListener("click",()=>{
    const current=document.querySelector(".page.active")?.id;
    utilitiesReturnPage=current&&current!=="utilities"?current:"blocks";
    utilitiesReturnScrollY=window.scrollY;
    activateAppPage("utilities",{save:false});
    logAction("Відкрито вкладку «Зручності».");
    window.scrollTo(0,0);
  });
  utilitiesBack?.addEventListener("click",()=>{
    logAction("Із вкладки «Зручності» виконано повернення назад.");
    activateAppPage(utilitiesReturnPage,{save:false});
    requestAnimationFrame(()=>window.scrollTo(0,utilitiesReturnScrollY));
  });
  utilitiesTools?.addEventListener("click",()=>{
    // Кнопки працюють як звичайні вкладки: повторне натискання не перемикає назад.
    const wasConsole=mainApp?.classList.contains("utilities-console-view");
    activateAppPage("utilities",{save:false});
    if(wasConsole)logAction("У розділі «Зручності» відкрито інструменти.");
    window.scrollTo(0,0);
  });
  utilitiesConsole?.addEventListener("click",()=>{
    const wasConsole=mainApp?.classList.contains("utilities-console-view");
    activateAppPage("utilities-console",{save:false});
    if(!wasConsole)logAction("У розділі «Зручності» відкрито консоль.");
    window.scrollTo(0,0);
  });
  // Лише визначені типи дій: жодний пароль або вміст буфера сюди не передається.
  const utilityActionMessages={
    password_generated:"У вкладці «Зручності» згенеровано пароль.",
    password_settings_changed:"У вкладці «Зручності» змінено налаштування генератора паролів.",
    password_generation_failed:"У вкладці «Зручності» не вдалося згенерувати пароль.",
    password_copied:"У вкладці «Зручності» скопійовано пароль.",
    password_copy_failed:"У вкладці «Зручності» не вдалося скопіювати пароль.",
    ratio_copy_failed:"У вкладці «Зручності» не вдалося скопіювати коефіцієнт піднятої ваги.",
    conversion_copy_failed:"У вкладці «Зручності» не вдалося скопіювати результат конвертації."
  };
  window.addEventListener("utilities:action",event=>{
    if(!$("utilities")?.classList.contains("active"))return;
    const type=event.detail?.type;
    if(type==="timezone_changed"){
      const zone=String(event.detail?.zone||"Часовий пояс пристрою").slice(0,100);
      logAction(`У вкладці «Зручності» змінено часовий пояс на «${zone}».`);
    }else if(type==="ratio_copied"||type==="conversion_copied"){
      // Записуємо лише числовий РЕЗУЛЬТАТ успішного копіювання.
      // Довільні рядки, введені ваги та паролі не журналюємо.
      const value=String(event.detail?.value??"").trim();
      if(!/^\d+(?:[,.]\d{1,10})?$/.test(value))return;
      if(type==="ratio_copied"){
        logAction(`У вкладці «Зручності» скопійовано коефіцієнт піднятої ваги: ${value}.`);
      }else{
        const unit=event.detail?.unit==="lbs"?"lbs":"кг";
        logAction(`У вкладці «Зручності» скопійовано результат конвертації: ${value} ${unit}.`);
      }
    }else if(Object.prototype.hasOwnProperty.call(utilityActionMessages,type)){
      logAction(utilityActionMessages[type]);
    }
  });

  profileOpen?.addEventListener("click",()=>activateAppPage("profile",{label:"Профіль"}));
  profileDisplayName?.addEventListener("click",()=>{
    if(authUser?.role==="admin")activateAppPage("admin",{label:"Адміністратор"});
  });

  profileDisplayInput?.addEventListener("input",()=>{
    if(profileDisplayInput.value.length>20)profileDisplayInput.value=profileDisplayInput.value.slice(0,20);
    if(profileDisplayCount)profileDisplayCount.textContent=String(profileDisplayInput.value.length);
  });

  profilePhotoButton?.addEventListener("click",()=>profilePhotoInput?.click());
  profilePhotoChange?.addEventListener("click",()=>profilePhotoInput?.click());
  profilePhotoInput?.addEventListener("change",async()=>{
    const file=profilePhotoInput.files?.[0];
    if(!file)return;
    try{
      const avatar=await resizeProfileImage(file);
      saveUndoSnapshot("Зміна фото профілю");
      profileData=collectProfileForm(avatar);
      if(saveProfileLocal()===false)throw new Error("Не вдалося зберегти фото. Перевірте сховище браузера.");
      showButtonState(profilePhotoChange,"Фото збережено","success");
      logAction("Фото профілю змінено.",{profile_change:{avatar:"оновлено"}});
    }catch(error){
      showButtonState(profilePhotoChange,"Помилка","error");
      alert(error?.message||"Не вдалося обробити фото.");
    }finally{
      profilePhotoInput.value="";
    }
  });

  profilePhotoRemove?.addEventListener("click",()=>{
    if(!profileData.avatar)return;
    // v86: same native OK / Cancel confirmation as account logout.
    // Nothing is written or synchronized if Cancel is pressed.
    if(!confirm("Ви справді бажаєте видалити фото профілю?"))return;
    saveUndoSnapshot("Видалення фото профілю");
    profileData=collectProfileForm("");
    if(saveProfileLocal()===false){showButtonState(profilePhotoRemove,"Не видалено","error");return;}
    showButtonState(profilePhotoRemove,"Видалено","success");
    logAction("Фото профілю видалено.",{profile_change:{avatar:"видалено"}});
  });

  profileSave?.addEventListener("click",()=>{
    saveUndoSnapshot("Зміна профілю");
    const previous=normalizeProfile(profileData);
    profileData=collectProfileForm(profileData.avatar);
    if(saveProfileLocal()===false){showButtonState(profileSave,"Не збережено","error");return;}
    showButtonState(profileSave,"Збережено","success");
    const fields={display_name:"Відображуване ім’я",full_name:"ПІБ",birth_date:"Дата народження",weight:"Вага",height:"Зріст"};
    const changed=Object.keys(fields).filter(key=>String(previous[key]??"")!==String(profileData[key]??""));
    const summary=changed.length?changed.map(key=>`${fields[key]}: «${previous[key]||"—"}» → «${profileData[key]||"—"}»`).join("; "):"без змін";
    logAction(`Профіль збережено: ${summary}.`,{profile:{display_name:profileData.display_name,full_name:profileData.full_name,birth_date:profileData.birth_date,weight:profileData.weight,height:profileData.height},changed_fields:changed});
    setTimeout(()=>activateAppPage("blocks",{label:"КБЖВ-блоки"}),360);
  });

  function productSearchRank(product,query){
    const name=normalizeCategorySearch(product?.name||"");
    if(!query||!name)return 999;
    if(name===query)return 0;
    if(name.startsWith(query))return 1;
    if(name.split(/\s+/).some(part=>part.startsWith(query)))return 2;
    if(name.includes(query))return 3;
    return 999;
  }

  function renderProducts(filter="") {
    if(!grid)return;
    updateSiteDataCounts();
    const q=normalizeCategorySearch(filter);
    grid.innerHTML="";

    const sorted=getSortedProducts();

    // Пошук працює тільки за назвою продукту. Відділи, описи та їхні aliases
    // не можуть піднімати нерелевантні картки вище за збіг у назві.
    if(q){
      const filtered=sorted
        .map((product,index)=>({product,index,rank:productSearchRank(product,q)}))
        .filter(item=>item.rank<999)
        .sort((a,b)=>a.rank-b.rank||a.index-b.index)
        .map(item=>item.product);

      if(!filtered.length){
        const empty=document.createElement("div");
        empty.style.cssText="grid-column:1/-1;text-align:center;padding:30px;color:var(--text-secondary)";
        empty.textContent="Продуктів із такою назвою не знайдено.";
        grid.appendChild(empty);
        return;
      }

      filtered.forEach(product=>grid.appendChild(createProductCard(product)));
      updateReorderState();
      return;
    }

    if(!sorted.length){
      const empty=document.createElement("div");
      empty.style.cssText="grid-column:1/-1;text-align:center;padding:30px;color:var(--text-secondary)";
      empty.textContent="Продуктів ще немає.";
      grid.appendChild(empty);
      return;
    }

    if(departmentsEnabled&&currentSort==="categories"){
      const orderedCategories=getOrderedCategories();
      const renderedIds=new Set();
      orderedCategories.forEach(category=>{
        const group=sorted.filter(product=>getProductCategory(product).id===category.id);
        if(!group.length)return;
        grid.appendChild(createCategorySeparator(category,group.length));
        group.forEach(product=>{renderedIds.add(product.id);grid.appendChild(createProductCard(product));});
      });
      sorted.filter(product=>!renderedIds.has(product.id)).forEach(product=>grid.appendChild(createProductCard(product)));
    }else{
      sorted.forEach(product=>grid.appendChild(createProductCard(product)));
    }

    updateReorderState();
  }

  function iconCopy(){
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M16 21H6a2 2 0 0 1-2-2V7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><rect x="8" y="3" width="13" height="13" rx="2" stroke="currentColor" stroke-width="1.6"/></svg><span class="tooltip">Скопіювати</span>`;
  }
  function iconEdit(){
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 20h9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4L16.5 3.5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg><span class="tooltip">Редагувати</span>`;
  }
  function createProductCard(product){
    const card=document.createElement("article");
    card.className="food-card"; card.dataset.id=product.id;
    const actions=document.createElement("div"); actions.className="card-actions";
    const copy=document.createElement("button"); copy.type="button"; copy.className="copy-btn"; copy.innerHTML=iconCopy();
    const edit=document.createElement("button"); edit.type="button"; edit.className="edit-btn"; edit.innerHTML=iconEdit();
    copy.addEventListener("click",e=>{e.stopPropagation();openProductModal(product);});
    edit.addEventListener("click",e=>{e.stopPropagation();openEditProductModal(product);});
    actions.append(copy,edit);

    const title=document.createElement("div"); title.className="food-title";
    const badge=document.createElement("div"); badge.className="badge"; badge.textContent=getInitials(product.name);
    const tc=document.createElement("div");
    const name=document.createElement("div"); name.className="name"; name.textContent=product.name;
    const meta=document.createElement("div"); meta.className="meta"; meta.textContent=`100 ${product.unit||"г"}`;
    tc.append(name,meta); title.append(badge,tc);

    const kbjv=document.createElement("div"); kbjv.className="kbjv";
    const row=(key,val,unit="г",noData=false,displayValue=null)=>`<div class="row"><div class="key">${key}</div><div class="val${noData?" no-data-value":""}">${noData?"Немає даних":`${displayValue??formatNumber(val)} ${unit}`}</div></div>`;
    kbjv.innerHTML =
      row("Калорії",product.kcal,"ккал",product.kcal_no_data,productDisplayNumber(product,"kcal")) +
      `<div class="kbjv-divider"></div>` +
      row("Білки",product.protein,"г",product.protein_no_data,productDisplayNumber(product,"protein")) +
      row("Жири",product.fat,"г",product.fat_no_data,productDisplayNumber(product,"fat")) +
      row("Вуглеводи",product.carb,"г",product.carb_no_data,productDisplayNumber(product,"carb")) +
      `<div class="kbjv-divider"></div>` +
      row("Цукри",product.sugar,"г",product.sugar_no_data,productDisplayNumber(product,"sugar")) +
      row("Сіль",product.salt,"г",product.salt_no_data,productDisplayNumber(product,"salt")) +
      `<div class="kbjv-divider"></div>` +
      row("Клітковина",product.fiber,"г",product.fiber_no_data,productDisplayNumber(product,"fiber")) +
      `<div class="kbjv-divider"></div>`;

    const full=document.createElement("div"); full.className="full-name";
    full.textContent=product.full_name_no_data?"Немає даних":(product.full_name||"");
    if(product.full_name_no_data)full.classList.add("no-data-value");
    card.append(actions,title,kbjv,full);
    card.addEventListener("click",e=>{if(!reorderMode&&!e.target.closest(".card-actions"))openProductModal(product);});
    return card;
  }

  searchInput?.addEventListener("input",()=>{renderProducts(searchInput.value);clearSearch.style.display=searchInput.value?"block":"none";});
  clearSearch?.addEventListener("click",()=>{const hadValue=!!searchInput.value.trim();searchInput.value="";clearSearch.style.display="none";renderProducts();searchInput.focus();if(hadValue)logAction("Пошук продуктів очищено.");});

  function renderProductQuickWeights(product){
    if(!productQuickWeights)return;
    productQuickWeights.innerHTML="";
    const weights=normalizeQuickWeights(product?.quick_weights);
    productQuickWeights.hidden=!weights.length;
    weights.forEach(weight=>{
      const button=document.createElement("button");
      button.type="button";
      button.className="product-quick-weight-button";
      button.textContent=`${formatNumber(weight)} г`;
      button.addEventListener("click",()=>{
        productWeight.value=formatNumber(weight);
        productQuickWeights.querySelectorAll(".product-quick-weight-button").forEach(item=>item.classList.toggle("active",item===button));
      });
      productQuickWeights.append(button);
    });
  }
  function openProductModal(product){
    selectedProduct=product;
    productModalName.textContent=product.name;
    productWeight.value="";
    renderProductQuickWeights(product);
    productModal.classList.add("active");
    document.body.classList.add("edit-modal-open");
    try{productWeight.focus({preventScroll:true});}catch(_){productWeight.focus();}
    requestAnimationFrame(()=>{try{productWeight.focus({preventScroll:true});}catch(_){productWeight.focus();}});
    logAction(`Відкрито продукт «${product.name}».`);
  }
  function closeProductModal(){selectedProduct=null;productModal.classList.remove("active");document.body.classList.remove("edit-modal-open");if(productQuickWeights){productQuickWeights.innerHTML="";productQuickWeights.hidden=true;}}
  productCancel?.addEventListener("click",()=>{
    showButtonState(productCancel,"Скасовано","error",700);
    logAction("Перегляд продукту закрито без дії.");
    setTimeout(closeProductModal,260);
  });
  productModal?.addEventListener("click",e=>{if(e.target===productModal)closeProductModal();});
  productModal?.addEventListener("touchmove",e=>{if(e.target===productModal)e.preventDefault();},{passive:false});

  function calculateProduct(product,weight){
    const m=number(weight)/100;
    return {kcal:product.kcal*m,protein:product.protein*m,fat:product.fat*m,carb:product.carb*m,sugar:product.sugar*m,salt:product.salt*m,fiber:product.fiber*m};
  }
  function getProductSummary(product,weight){
    const v=calculateProduct(product,weight);
    const isBase=Math.abs(number(weight)-100)<1e-9;
    const shown=(key,value)=>isBase?productDisplayNumber(product,key):formatNumber(value);
    const kcalText=product.kcal_no_data?"немає даних калорій":`${shown("kcal",v.kcal)} ккал`;
    const proteinText=product.protein_no_data?"немає даних білків":`${shown("protein",v.protein)} білка`;
    const fatText=product.fat_no_data?"немає даних жирів":`${shown("fat",v.fat)} жирів`;
    const carbText=product.carb_no_data?"немає даних вуглеводів":`${shown("carb",v.carb)} вуглеводів`;
    const sugarText=product.sugar_no_data?"немає даних цукрів":`${shown("sugar",v.sugar)} цукрів`;
    const saltText=product.salt_no_data?"немає даних солі":`${shown("salt",v.salt)} солі`;
    const fiberText=product.fiber_no_data?"немає даних клітковини":`${shown("fiber",v.fiber)} клітковини`;
    return `${product.name}, для ${formatNumber(weight)} г — ${kcalText} / ${proteinText} / ${fatText} / ${carbText} / ${sugarText} / ${saltText} / ${fiberText}`;
  }
  async function copyText(text){
    try{await navigator.clipboard.writeText(text);return true;}catch(_){
      let textarea=null;
      try{
        textarea=document.createElement("textarea");textarea.value=text;
        textarea.style.position="fixed";textarea.style.left="-9999px";
        document.body.append(textarea);textarea.select();
        return document.execCommand("copy")===true;
      }catch(_2){return false;}
      finally{textarea?.remove();}
    }
  }
  productCopy?.addEventListener("click",async()=>{
    if(!selectedProduct)return; const w=number(productWeight.value); if(w<=0)return productWeight.focus();
    if(await copyText(getProductSummary(selectedProduct,w))){showButtonState(productCopy,"Скопійовано","success",1200);logAction(`Скопійовано продукт «${selectedProduct.name}» (${formatNumber(w)} г).`);}else showButtonState(productCopy,"Не скопійовано","error",1200);
  });
  productCalculator?.addEventListener("click",()=>{
    if(!selectedProduct)return; const w=number(productWeight.value); if(w<=0)return productWeight.focus();
    const productName=selectedProduct.name;
    const text=getProductSummary(selectedProduct,w);
    saveUndoSnapshot(`Додавання продукту «${productName}» у поле калькулятора`);
    const current=calcInput.value.trim(); calcInput.value=current?`${current}\n${text}`:text; saveCalculatorDraft();
    showButtonState(productCalculator,"Додано","success"); logAction(`Продукт «${productName}» додано в калькулятор.`);
    setTimeout(closeProductModal,260);
  });

  function setNoDataField(input,checkbox,active,emptyValue="0"){
    if(!input||!checkbox)return;
    checkbox.checked=!!active;
    input.disabled=!!active;
    if(active)input.value=emptyValue;
  }
  const noDataFieldPairs=[
    [newProductKcal,newProductKcalNoData,"0"],
    [newProductProtein,newProductProteinNoData,"0"],
    [newProductFat,newProductFatNoData,"0"],
    [newProductCarb,newProductCarbNoData,"0"],
    [newProductSugar,newProductSugarNoData,"0"],
    [newProductSalt,newProductSaltNoData,"0"],
    [newProductFiber,newProductFiberNoData,"0"],
    [newProductDescription,newProductDescriptionNoData,""],
    [editProductKcal,editProductKcalNoData,"0"],
    [editProductProtein,editProductProteinNoData,"0"],
    [editProductFat,editProductFatNoData,"0"],
    [editProductCarb,editProductCarbNoData,"0"],
    [editProductSugar,editProductSugarNoData,"0"],
    [editProductSalt,editProductSaltNoData,"0"],
    [editProductFiber,editProductFiberNoData,"0"],
    [editProductDescription,editProductDescriptionNoData,""]
  ];
  noDataFieldPairs.forEach(([input,checkbox,emptyValue])=>checkbox?.addEventListener("change",()=>setNoDataField(input,checkbox,checkbox.checked,emptyValue)));

  function clearAddForm(){
    [newProductName,newProductKcal,newProductProtein,newProductFat,newProductCarb,newProductSugar,newProductSalt,newProductFiber,newProductDescription].forEach(el=>el.value="");
    newProductQuickWeights.forEach(input=>input.value="");
    if(newProductCategory)newProductCategory.value="";
    [
      [newProductKcal,newProductKcalNoData,"0"],
      [newProductProtein,newProductProteinNoData,"0"],
      [newProductFat,newProductFatNoData,"0"],
      [newProductCarb,newProductCarbNoData,"0"],
      [newProductSugar,newProductSugarNoData,"0"],
      [newProductSalt,newProductSaltNoData,"0"],
      [newProductFiber,newProductFiberNoData,"0"],
      [newProductDescription,newProductDescriptionNoData,""]
    ].forEach(([input,checkbox,emptyValue])=>setNoDataField(input,checkbox,false,emptyValue));
  }
  addProductButton?.addEventListener("click",()=>{clearAddForm();addProductModal.classList.add("active");document.body.classList.add("edit-modal-open");logAction("Відкрито додавання продукту.");setTimeout(()=>newProductName.focus(),50);});
  addProductCancel?.addEventListener("click",()=>{showButtonState(addProductCancel,"Скасовано","error",500);setTimeout(()=>{addProductModal.classList.remove("active");document.body.classList.remove("edit-modal-open");requestAnimationFrame(()=>showButtonState(addProductButton,"Продукт не додано","error"));},260);logAction("Додавання продукту скасовано.");});
  addProductModal?.addEventListener("click",e=>{if(e.target===addProductModal){addProductModal.classList.remove("active");document.body.classList.remove("edit-modal-open");}});
  // v87: browser min/step hints are not validation for click handlers.
  function validateProductNumericFields(fields,quickWeights=[]){
    for(const [input,noData] of fields){
      if(!input||noData?.checked)continue;
      const raw=String(input.value??"").trim();
      if(raw&&!Number.isFinite(Number(raw)) || (raw&&Number(raw)<0)){
        alert("Харчові показники не можуть бути від’ємними або некоректними.");
        input.focus();return false;
      }
    }
    for(const input of quickWeights){
      const raw=String(input?.value??"").trim();
      if(raw&&(!Number.isFinite(Number(raw))||Number(raw)<=0)){
        alert("Швидка вага повинна бути більшою за нуль.");
        input?.focus();return false;
      }
    }
    return true;
  }
  const addProductNumberFields=[[newProductKcal,newProductKcalNoData],[newProductProtein,newProductProteinNoData],[newProductFat,newProductFatNoData],[newProductCarb,newProductCarbNoData],[newProductSugar,newProductSugarNoData],[newProductSalt,newProductSaltNoData],[newProductFiber,newProductFiberNoData]];
  const editProductNumberFields=[[editProductKcal,editProductKcalNoData],[editProductProtein,editProductProteinNoData],[editProductFat,editProductFatNoData],[editProductCarb,editProductCarbNoData],[editProductSugar,editProductSugarNoData],[editProductSalt,editProductSaltNoData],[editProductFiber,editProductFiberNoData]];
  addProductSave?.addEventListener("click",()=>{
    const name=newProductName.value.trim(); if(!name)return newProductName.focus();
    const category=newProductCategory?.value||""; if(!category)return newProductCategory?.focus();
    if(!validateProductNumericFields(addProductNumberFields,newProductQuickWeights))return;
    saveUndoSnapshot(`Додавання продукту «${name}»`);
    products.push(normalizeProduct({
      id:createId("product"),name,
      kcal:newProductKcalNoData?.checked?0:newProductKcal.value,kcal_no_data:!!newProductKcalNoData?.checked,
      protein:newProductProteinNoData?.checked?0:newProductProtein.value,protein_no_data:!!newProductProteinNoData?.checked,
      fat:newProductFatNoData?.checked?0:newProductFat.value,fat_no_data:!!newProductFatNoData?.checked,
      carb:newProductCarbNoData?.checked?0:newProductCarb.value,carb_no_data:!!newProductCarbNoData?.checked,
      sugar:newProductSugarNoData?.checked?0:newProductSugar.value,sugar_no_data:!!newProductSugarNoData?.checked,
      salt:newProductSaltNoData?.checked?0:newProductSalt.value,salt_no_data:!!newProductSaltNoData?.checked,
      fiber:newProductFiberNoData?.checked?0:newProductFiber.value,fiber_no_data:!!newProductFiberNoData?.checked,
      unit:"г",
      category,
      quick_weights:readQuickWeightInputs(newProductQuickWeights),
      full_name:newProductDescriptionNoData?.checked?"":newProductDescription.value.trim(),
      full_name_no_data:!!newProductDescriptionNoData?.checked,
      created_at:new Date().toISOString()
    }));
    if(!saveProductsLocal()){showButtonState(addProductSave,"Не збережено","error",1500);return;}
    renderProducts(searchInput?.value||"");showButtonState(addProductSave,"Збережено","success",500);
    setTimeout(()=>{addProductModal.classList.remove("active");document.body.classList.remove("edit-modal-open");requestAnimationFrame(()=>showButtonState(addProductButton,"Продукт додано","success"));},260);
    logAction(`Додано продукт «${name}».`,{product:products[products.length-1]});
  });

  function openEditProductModal(product){
    editingProduct=product;
    editProductName.value=product.name;
    editProductKcal.value=productDisplayNumber(product,"kcal");setNoDataField(editProductKcal,editProductKcalNoData,product.kcal_no_data);
    editProductProtein.value=productDisplayNumber(product,"protein");setNoDataField(editProductProtein,editProductProteinNoData,product.protein_no_data);
    editProductFat.value=productDisplayNumber(product,"fat");setNoDataField(editProductFat,editProductFatNoData,product.fat_no_data);
    editProductCarb.value=productDisplayNumber(product,"carb");setNoDataField(editProductCarb,editProductCarbNoData,product.carb_no_data);
    editProductSugar.value=productDisplayNumber(product,"sugar");setNoDataField(editProductSugar,editProductSugarNoData,product.sugar_no_data);
    editProductSalt.value=productDisplayNumber(product,"salt");setNoDataField(editProductSalt,editProductSaltNoData,product.salt_no_data);
    editProductFiber.value=productDisplayNumber(product,"fiber");setNoDataField(editProductFiber,editProductFiberNoData,product.fiber_no_data);
    if(editProductCategory)editProductCategory.value=getProductCategory(product).id;
    fillQuickWeightInputs(editProductQuickWeights,product.quick_weights);
    editProductDescription.value=product.full_name||"";setNoDataField(editProductDescription,editProductDescriptionNoData,product.full_name_no_data,"");
    editProductModal.classList.add("active");document.body.classList.add("edit-modal-open");logAction(`Відкрито редагування продукту «${product.name}».`);setTimeout(()=>editProductName.focus(),50);
  }
  function closeEditProductModal(){editingProduct=null;editProductModal.classList.remove("active");document.body.classList.remove("edit-modal-open");}
  editProductCancel?.addEventListener("click",()=>{const n=editingProduct?.name||"продукту";showButtonState(editProductCancel,"Скасовано","error");logAction(`Редагування «${n}» скасовано.`);setTimeout(closeEditProductModal,400);});
  editProductModal?.addEventListener("click",e=>{if(e.target===editProductModal)closeEditProductModal();});
  editProductModal?.addEventListener("touchmove",e=>{if(e.target===editProductModal)e.preventDefault();},{passive:false});
  editProductSave?.addEventListener("click",()=>{
    if(!editingProduct)return;
    const name=editProductName.value.trim(); if(!name)return editProductName.focus();
    if(!validateProductNumericFields(editProductNumberFields,editProductQuickWeights))return;
    saveUndoSnapshot(`Редагування продукту «${editingProduct.name}»`);
    Object.assign(editingProduct,{
      name,
      kcal:editProductKcalNoData?.checked?0:number(editProductKcal.value),kcal_no_data:!!editProductKcalNoData?.checked,
      protein:editProductProteinNoData?.checked?0:number(editProductProtein.value),protein_no_data:!!editProductProteinNoData?.checked,
      fat:editProductFatNoData?.checked?0:number(editProductFat.value),fat_no_data:!!editProductFatNoData?.checked,
      carb:editProductCarbNoData?.checked?0:number(editProductCarb.value),carb_no_data:!!editProductCarbNoData?.checked,
      sugar:editProductSugarNoData?.checked?0:number(editProductSugar.value),sugar_no_data:!!editProductSugarNoData?.checked,
      salt:editProductSaltNoData?.checked?0:number(editProductSalt.value),salt_no_data:!!editProductSaltNoData?.checked,
      fiber:editProductFiberNoData?.checked?0:number(editProductFiber.value),fiber_no_data:!!editProductFiberNoData?.checked,
      category:editProductCategory?.value||getProductCategory(editingProduct).id,
      quick_weights:readQuickWeightInputs(editProductQuickWeights),
      display:{
        kcal:normalizeDisplayNumber(editProductKcal.value,number(editProductKcal.value)),
        protein:normalizeDisplayNumber(editProductProtein.value,number(editProductProtein.value)),
        fat:normalizeDisplayNumber(editProductFat.value,number(editProductFat.value)),
        carb:normalizeDisplayNumber(editProductCarb.value,number(editProductCarb.value)),
        sugar:normalizeDisplayNumber(editProductSugar.value,number(editProductSugar.value)),
        salt:normalizeDisplayNumber(editProductSalt.value,number(editProductSalt.value)),
        fiber:normalizeDisplayNumber(editProductFiber.value,number(editProductFiber.value))
      },
      full_name:editProductDescriptionNoData?.checked?"":editProductDescription.value.trim(),
      full_name_no_data:!!editProductDescriptionNoData?.checked
    });
    if(!saveProductsLocal()){showButtonState(editProductSave,"Не збережено","error",1500);return;}
    renderProducts(searchInput?.value||"");
    showButtonState(editProductSave,"Збережено","success"); logAction(`Зміни продукту «${name}» збережено.`,{product:normalizeProduct(editingProduct)});
    setTimeout(closeEditProductModal,400);
  });

  const SORT_LABELS={
    categories:"за відділами",
    oldest:"за датою: від старіших до новіших",
    newest:"за датою: від новіших до старіших",
    list:"списком А–Я",
    random:"хаотично",
    initial:"у початковому порядку",
    manual:"у ручному порядку"
  };
  const SORT_BUTTONS={
    categories:sortCategories,
    oldest:sortOldest,
    newest:sortNewest,
    list:sortList,
    random:sortRandom,
    initial:sortInitial
  };
  function categoryById(id){
    return getAllCategories().find(category=>category.id===id)||null;
  }
  function renderCategoryOrderList(){
    if(!categoryOrderList)return;
    categoryOrderList.innerHTML="";
    const order=normalizeCategoryOrder(pendingCategoryOrder);
    pendingCategoryOrder=[...order];

    order.forEach((id,index)=>{
      const category=categoryById(id);
      if(!category)return;

      const row=document.createElement("div");
      row.className="category-order-row";
      row.dataset.category=id;

      const position=document.createElement("span");
      position.className="category-order-position";
      position.textContent=String(index+1);

      const label=document.createElement("span");
      label.className="category-order-label";
      label.textContent=category.label;

      const controls=document.createElement("div");
      controls.className="category-order-controls";

      const up=document.createElement("button");
      up.type="button";
      up.className="category-order-move";
      up.textContent="↑";
      up.title="Перемістити вище";
      up.disabled=index===0;

      const down=document.createElement("button");
      down.type="button";
      down.className="category-order-move";
      down.textContent="↓";
      down.title="Перемістити нижче";
      down.disabled=index===order.length-1;

      up.addEventListener("click",()=>{
        if(index<=0)return;
        showButtonState(up,"↑","success",140);
        setTimeout(()=>{
          [pendingCategoryOrder[index-1],pendingCategoryOrder[index]]=[pendingCategoryOrder[index],pendingCategoryOrder[index-1]];
          logAction(`Відділ «${category.label}» переміщено вище.`);
          renderCategoryOrderList();
        },140);
      });
      down.addEventListener("click",()=>{
        if(index>=order.length-1)return;
        showButtonState(down,"↓","success",140);
        setTimeout(()=>{
          [pendingCategoryOrder[index],pendingCategoryOrder[index+1]]=[pendingCategoryOrder[index+1],pendingCategoryOrder[index]];
          logAction(`Відділ «${category.label}» переміщено нижче.`);
          renderCategoryOrderList();
        },140);
      });

      controls.append(up,down);
      row.append(position,label,controls);
      categoryOrderList.append(row);
    });
  }
  function openCategoryOrderModal(){
    pendingCategoryOrder=getCategoryOrder();
    renderCategoryOrderList();
    sortProductsModal?.classList.remove("active");
    categoryOrderModal?.classList.add("active");
    document.body.classList.add("edit-modal-open");
    logAction("Відкрито налаштування порядку відділів.");
  }
  function closeCategoryOrderModal(returnToSort=false){
    categoryOrderModal?.classList.remove("active");
    pendingCategoryOrder=null;
    if(returnToSort){
      sortProductsModal?.classList.add("active");
      updateSortOptionState();
      document.body.classList.add("edit-modal-open");
    }else if(!deleteProductModal?.classList.contains("active")){
      document.body.classList.remove("edit-modal-open");
    }
  }
  sortCategoryOrder?.addEventListener("click",()=>{
    showButtonState(sortCategoryOrder,"Відкрито","success",500);
    setTimeout(openCategoryOrderModal,220);
  });
  categoryOrderReset?.addEventListener("click",()=>{
    pendingCategoryOrder=defaultCategoryOrder();
    renderCategoryOrderList();
    showButtonState(categoryOrderReset,"Скинуто","error",1000);
    logAction("Порядок відділів скинуто до початкового у вікні налаштування.");
  });
  categoryOrderCancel?.addEventListener("click",()=>{
    showButtonState(categoryOrderCancel,"Скасовано","error",500);
    logAction("Зміну порядку відділів скасовано.");
    setTimeout(()=>{closeCategoryOrderModal(true);requestAnimationFrame(()=>showButtonState(sortCategoryOrder,"Не змінено","error"));},260);
  });
  categoryOrderSave?.addEventListener("click",()=>{
    saveUndoSnapshot("Зміна порядку відділів");
    beginStorageTransaction("Збереження порядку відділів");
    saveCategoryOrder(pendingCategoryOrder||defaultCategoryOrder());
    if(departmentsEnabled){
      currentSort="categories";
      safeStorageSet(SORT_KEY,"categories",{critical:true});markLocalDataChanged();
    }
    if(!finishStorageTransaction()){reloadPrimaryStateFromStorage();showButtonState(categoryOrderSave,"Не збережено","error");return;}
    renderProducts(searchInput?.value||"");
    if(deleteProductModal?.classList.contains("active"))renderDeleteProductList();
    showButtonState(categoryOrderSave,"Збережено","success",500);
    const outer=sortTarget==="delete"?deleteSortProducts:sortProductsButton;
    logAction(departmentsEnabled?"Порядок відділів збережено; сортування за відділами застосовано.":"Порядок відділів збережено; відділи залишаються вимкненими.");
    setTimeout(()=>{closeCategoryOrderModal(false);requestAnimationFrame(()=>showButtonState(outer,"Збережено","success"));},260);
  });
  categoryOrderModal?.addEventListener("click",e=>{
    if(e.target===categoryOrderModal){
      logAction("Налаштування порядку відділів закрито без збереження.");
      closeCategoryOrderModal(true);
    }
  });


  function updateSortOptionState(){
    Object.entries(SORT_BUTTONS).forEach(([mode,button])=>{
      if(!button)return;
      button.classList.toggle("sort-option-current",mode===currentSort);
    });
    if(sortCategories)sortCategories.disabled=!departmentsEnabled;
    if(sortDepartmentsToggle)sortDepartmentsToggle.checked=departmentsEnabled;
  }
  function closeSortModal(){
    sortProductsModal?.classList.remove("active");
    if(!deleteProductModal?.classList.contains("active"))document.body.classList.remove("edit-modal-open");
  }
  function openSortModal(target="blocks"){
    sortTarget=target;
    updateSortOptionState();
    sortProductsModal.classList.add("active");
    document.body.classList.add("edit-modal-open");
    logAction("Відкрито сортування продуктів.");
  }
  sortProductsButton?.addEventListener("click",()=>openSortModal("blocks"));
  deleteSortProducts?.addEventListener("click",()=>openSortModal("delete"));
  sortProductsCancel?.addEventListener("click",()=>{
    showButtonState(sortProductsCancel,"Скасовано","error",500);
    const b=sortTarget==="delete"?deleteSortProducts:sortProductsButton;
    logAction("Сортування продуктів скасовано.");
    setTimeout(()=>{closeSortModal();requestAnimationFrame(()=>showButtonState(b,"Не відсортовано","error"));},260);
  });
  sortProductsModal?.addEventListener("click",e=>{
    if(e.target===sortProductsModal){
      const b=sortTarget==="delete"?deleteSortProducts:sortProductsButton;
      logAction("Сортування продуктів закрито без змін.");
      closeSortModal();
      requestAnimationFrame(()=>showButtonState(b,"Не відсортовано","error"));
    }
  });
  function applySort(mode){
    if(!SORT_BUTTONS[mode])return;
    if(mode==="categories"&&!departmentsEnabled){
      showButtonState(sortCategories,"Відділи вимкнено","error");
      return;
    }
    saveUndoSnapshot("Сортування продуктів");
    beginStorageTransaction("Сортування продуктів");
    currentSort=mode;
    safeStorageSet(SORT_KEY,mode,{critical:true});markLocalDataChanged();
    if(mode==="random"){safeStorageSet(RANDOM_SORT_SEED_KEY,`${Date.now()}-${Math.random()}`,{critical:true});markLocalDataChanged();}
    if(!finishStorageTransaction()){reloadPrimaryStateFromStorage();showButtonState(SORT_BUTTONS[mode],"Не збережено","error");return;}
    updateSortOptionState();

    const selectedSortButton=SORT_BUTTONS[mode];
    showButtonState(selectedSortButton,"Відсортовано","success",500);

    renderProducts(searchInput?.value||"");
    if(deleteProductModal.classList.contains("active"))renderDeleteProductList();

    const outer=sortTarget==="delete"?deleteSortProducts:sortProductsButton;
    logAction(`Продукти відсортовано ${SORT_LABELS[mode]}.`);
    setTimeout(()=>{closeSortModal();requestAnimationFrame(()=>showButtonState(outer,"Відсортовано","success"));},260);
  }
  function saveDepartmentsEnabled(value){
    if(!persistUserChange("Налаштування відділів",()=>safeStorageSet(DEPARTMENTS_ENABLED_KEY,value?"1":"0",{critical:true})))return false;
    departmentsEnabled=!!value;updateSortOptionState();return true;
  }

  sortDepartmentsToggle?.addEventListener("change",()=>{
    const next=!!sortDepartmentsToggle.checked;
    saveUndoSnapshot(next?"Увімкнення відділів":"Вимкнення відділів");
    beginStorageTransaction("Зміна відділів");
    saveDepartmentsEnabled(next);
    currentSort=next?"categories":"initial";
    safeStorageSet(SORT_KEY,currentSort,{critical:true});markLocalDataChanged();
    if(!finishStorageTransaction()){reloadPrimaryStateFromStorage();showButtonState(sortDepartmentsToggle,"Не збережено","error");return;}
    renderProducts(searchInput?.value||"");
    if(deleteProductModal?.classList.contains("active"))renderDeleteProductList();
    logAction(next?"Відділи увімкнено.":"Відділи вимкнено; сортування за відділами не застосовується.");
  });

  function renderCustomCategoryList(){
    if(!customCategoryList)return;

    const all=getAllCategories();
    const defaults=all.filter(category=>!category.custom);
    const custom=all.filter(category=>category.custom);
    customCategoryList.innerHTML="";

    function appendSection(title,categories,emptyText){
      const section=document.createElement("section");
      section.className="custom-category-section";

      const heading=document.createElement("div");
      heading.className="custom-category-section-title";
      heading.textContent=title;
      section.append(heading);

      const list=document.createElement("div");
      list.className="custom-category-section-list";

      if(!categories.length){
        const empty=document.createElement("div");
        empty.className="custom-category-empty";
        empty.textContent=emptyText;
        list.append(empty);
      }else{
        categories.forEach(category=>{
          const row=document.createElement("div");
          row.className="custom-category-row";

          const name=document.createElement("div");
          name.className="custom-category-name";
          name.textContent=category.label;

          const remove=document.createElement("button");
          remove.type="button";
          remove.className="custom-category-remove";
          remove.textContent="Видалити";

          remove.addEventListener("click",()=>{
            const ok=confirm(`Видалити відділ «${category.label}»? Самі продукти не видаляться.`);
            if(!ok){
              showButtonState(remove,"Скасовано","error");
              return;
            }

            saveUndoSnapshot(`Видалення відділу «${category.label}»`);
            products.forEach(product=>{
              if(String(product.category||"")===category.id)product.category="";
            });
            beginStorageTransaction("Видалення відділу");
            saveProductsLocal();

            if(category.custom){
              saveCustomCategories(getCustomCategories().filter(item=>item.id!==category.id));
            }else{
              saveDeletedDefaultCategoryIds([...getDeletedDefaultCategoryIds(),category.id]);
            }

            saveCategoryOrder(getCategoryOrder().filter(id=>id!==category.id));
            if(!finishStorageTransaction()){reloadPrimaryStateFromStorage();showButtonState(remove,"Не видалено","error");return;}
            populateProductCategorySelects();
            renderCustomCategoryList();
            renderCategoryOrderList();
            renderProducts(searchInput?.value||"");
            showButtonState(remove,"Видалено","success");
            logAction(`Відділ «${category.label}» видалено.`);
          });

          row.append(name,remove);
          list.append(row);
        });
      }

      section.append(list);
      customCategoryList.append(section);
    }

    appendSection(
      "Власні відділи",
      custom,
      "Власних відділів ще немає."
    );
    appendSection(
      "Відділи за замовчуванням",
      defaults,
      "Усі відділи за замовчуванням видалено."
    );
  }

  function openCustomCategoryModal(){
    sortProductsModal?.classList.remove("active");
    renderCustomCategoryList();
    if(customCategoryName)customCategoryName.value="";
    customCategoryModal?.classList.add("active");
    document.body.classList.add("edit-modal-open");
    setTimeout(()=>customCategoryName?.focus(),50);
    logAction("Відкрито налаштування власних відділів.");
  }

  function closeCustomCategoryModal(returnToSort=true){
    customCategoryModal?.classList.remove("active");
    if(returnToSort){
      sortProductsModal?.classList.add("active");
      updateSortOptionState();
      document.body.classList.add("edit-modal-open");
    }else if(!deleteProductModal?.classList.contains("active")){
      document.body.classList.remove("edit-modal-open");
    }
  }

  sortCustomCategory?.addEventListener("click",openCustomCategoryModal);
  customCategoryAdd?.addEventListener("click",()=>{
    const label=String(customCategoryName?.value||"").trim().replace(/\s+/g," ").slice(0,40);
    if(!label){
      showButtonState(customCategoryAdd,"Вкажіть назву","error");
      customCategoryName?.focus();
      return;
    }
    const duplicate=getAllCategories().some(category=>normalizeCategorySearch(category.label)===normalizeCategorySearch(label));
    if(duplicate){showButtonState(customCategoryAdd,"Вже існує","error");return;}
    saveUndoSnapshot(`Створення відділу «${label}»`);
    const custom=getCustomCategories();
    const created={id:createCustomCategoryId(),label};
    custom.push(created);
    beginStorageTransaction("Створення відділу");
    saveCustomCategories(custom);
    saveCategoryOrder([...getCategoryOrder(),created.id]);
    if(!finishStorageTransaction()){reloadPrimaryStateFromStorage();showButtonState(customCategoryAdd,"Не додано","error");return;}
    populateProductCategorySelects();
    renderCustomCategoryList();
    if(customCategoryName)customCategoryName.value="";
    showButtonState(customCategoryAdd,"Додано","success");
    logAction(`Створено власний відділ «${label}».`);
  });
  customCategoryName?.addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();customCategoryAdd?.click();}});
  customCategoryClose?.addEventListener("click",()=>{
    showButtonState(customCategoryClose,"Закрито","error");
    setTimeout(()=>closeCustomCategoryModal(true),260);
  });
  customCategoryModal?.addEventListener("click",event=>{if(event.target===customCategoryModal)closeCustomCategoryModal(true);});

  sortCategories?.addEventListener("click",()=>applySort("categories"));
  sortOldest?.addEventListener("click",()=>applySort("oldest"));
  sortNewest?.addEventListener("click",()=>applySort("newest"));
  sortList?.addEventListener("click",()=>applySort("list"));
  sortRandom?.addEventListener("click",()=>applySort("random"));
  sortInitial?.addEventListener("click",()=>applySort("initial"));

  deleteProductButton?.addEventListener("click",()=>{renderDeleteProductList();deleteProductModal.classList.add("active");document.body.classList.add("edit-modal-open");logAction("Відкрито видалення продукту.");});
  [deleteProductCancelTop,deleteProductCancelBottom].forEach(b=>b?.addEventListener("click",()=>{showButtonState(b,"Скасовано","error",500);setTimeout(()=>{deleteProductModal.classList.remove("active");document.body.classList.remove("edit-modal-open");requestAnimationFrame(()=>showButtonState(deleteProductButton,"Продукт не видалено","error"));},260);logAction("Видалення продукту скасовано.");}));
  deleteProductModal?.addEventListener("click",e=>{if(e.target===deleteProductModal){deleteProductModal.classList.remove("active");document.body.classList.remove("edit-modal-open");}});
  function renderDeleteProductList(){
    deleteProductList.innerHTML="";
    const list=getSortedProducts();
    if(!list.length){deleteProductList.innerHTML='<div class="delete-product-empty">База продуктів порожня.</div>';return;}
    list.forEach(product=>{
      const item=document.createElement("div");item.className="delete-product-item";
      const name=document.createElement("div");name.className="delete-product-item-name";name.textContent=product.name;
      const button=document.createElement("button");button.className="delete-product-item-button";button.textContent="Видалити";
      button.addEventListener("click",()=>{
        if(!confirm(`Видалити продукт "${product.name}"?`)){
          showButtonState(button,"Скасовано","error",1000);
          showButtonState(deleteProductButton,"Продукт не видалено","error",1500);
          logAction(`Видалення продукту «${product.name}» скасовано.`);
          return;
        }
        saveUndoSnapshot(`Видалення продукту «${product.name}»`);
        products=products.filter(p=>p.id!==product.id);if(!saveProductsLocal()){showButtonState(deleteProductButton,"Не видалено","error");return;}renderProducts(searchInput?.value||"");renderDeleteProductList();
        showButtonState(deleteProductButton,"Продукт видалено","success",1500); logAction(`Видалено продукт «${product.name}».`);
      });
      item.append(name,button);deleteProductList.append(item);
    });
  }

  function productById(id){
    return products.find(product=>product.id===id)||null;
  }
  function renderProductOrderList(){
    if(!productOrderList)return;
    productOrderList.innerHTML="";
    const order=Array.isArray(pendingProductOrder)?pendingProductOrder:[];
    if(!order.length){
      productOrderList.innerHTML='<div class="product-order-empty">База продуктів порожня.</div>';
      return;
    }

    order.forEach((id,index)=>{
      const product=productById(id);
      if(!product)return;

      const row=document.createElement("div");
      row.className="product-order-row";
      row.dataset.id=id;

      const position=document.createElement("span");
      position.className="product-order-position";
      position.textContent=String(index+1);

      const name=document.createElement("span");
      name.className="product-order-name";
      name.textContent=product.name;

      const controls=document.createElement("div");
      controls.className="product-order-controls";

      const up=document.createElement("button");
      up.type="button";
      up.className="product-order-move";
      up.textContent="↑";
      up.title="Перемістити вище";
      up.disabled=index===0;

      const down=document.createElement("button");
      down.type="button";
      down.className="product-order-move";
      down.textContent="↓";
      down.title="Перемістити нижче";
      down.disabled=index===order.length-1;

      up.addEventListener("click",()=>{
        if(index<=0)return;
        showButtonState(up,"↑","success",140);
        setTimeout(()=>{
          [pendingProductOrder[index-1],pendingProductOrder[index]]=[pendingProductOrder[index],pendingProductOrder[index-1]];
          logAction(`Продукт «${product.name}» переміщено вище у вікні зміни розташування.`);
          renderProductOrderList();
        },140);
      });
      down.addEventListener("click",()=>{
        if(index>=order.length-1)return;
        showButtonState(down,"↓","success",140);
        setTimeout(()=>{
          [pendingProductOrder[index],pendingProductOrder[index+1]]=[pendingProductOrder[index+1],pendingProductOrder[index]];
          logAction(`Продукт «${product.name}» переміщено нижче у вікні зміни розташування.`);
          renderProductOrderList();
        },140);
      });

      controls.append(up,down);
      row.append(position,name,controls);
      productOrderList.append(row);
    });
  }
  function openProductOrderModal(){
    productOrderOriginal=products.map(product=>product.id);
    pendingProductOrder=[...productOrderOriginal];
    renderProductOrderList();
    productOrderModal?.classList.add("active");
    document.body.classList.add("edit-modal-open");
    logAction("Відкрито зміну розташування продуктів.");
  }
  function closeProductOrderModal(){
    productOrderModal?.classList.remove("active");
    pendingProductOrder=null;
    productOrderOriginal=null;
    document.body.classList.remove("edit-modal-open");
  }
  reorderProductsButton?.addEventListener("click",()=>{
    if(!products.length){
      showButtonState(reorderProductsButton,"Немає продуктів","error",1500);
      logAction("Зміну розташування продуктів не відкрито: база порожня.");
      return;
    }
    openProductOrderModal();
  });
  function getInitialProductOrder(){
    return products
      .map((product,index)=>({product,index}))
      .sort((a,b)=>{
        const at=Date.parse(a.product?.created_at||"");
        const bt=Date.parse(b.product?.created_at||"");
        const av=Number.isFinite(at)?at:0;
        const bv=Number.isFinite(bt)?bt:0;
        return av-bv||a.index-b.index;
      })
      .map(entry=>entry.product.id);
  }
  productOrderReset?.addEventListener("click",()=>{
    pendingProductOrder=getInitialProductOrder();
    renderProductOrderList();
    showButtonState(productOrderReset,"Скинуто","error",1000);
    logAction("Порядок продуктів у вікні зміни розташування скинуто до початкового порядку додавання.");
  });
  productOrderCancel?.addEventListener("click",()=>{
    showButtonState(productOrderCancel,"Скасовано","error",500);
    logAction("Зміну розташування продуктів скасовано.");
    setTimeout(()=>{closeProductOrderModal();requestAnimationFrame(()=>showButtonState(reorderProductsButton,"Не змінено","error"));},260);
  });
  productOrderSave?.addEventListener("click",()=>{
    const next=Array.isArray(pendingProductOrder)?pendingProductOrder:[];
    const original=Array.isArray(productOrderOriginal)?productOrderOriginal:[];
    const changed=next.length===original.length&&next.some((id,index)=>id!==original[index]);

    if(changed){
      saveUndoSnapshot("Зміна розташування продуктів");
      const byId=new Map(products.map(product=>[product.id,product]));
      products=next.map(id=>byId.get(id)).filter(Boolean);
      currentSort="manual";
      beginStorageTransaction("Збереження порядку продуктів");
      safeStorageSet(SORT_KEY,"manual",{critical:true});
      saveProductsLocal();
      if(!finishStorageTransaction()){reloadPrimaryStateFromStorage();showButtonState(productOrderSave,"Не збережено","error");return;}
      renderProducts(searchInput?.value||"");
      showButtonState(productOrderSave,"Збережено","success",500);
      logAction("Розташування продуктів змінено та збережено.");
    }else{
      showButtonState(productOrderSave,"Не змінено","error",500);
      logAction("Зміну розташування продуктів завершено без змін.");
    }
    const reorderResultChanged=changed;
    setTimeout(()=>{closeProductOrderModal();requestAnimationFrame(()=>showButtonState(reorderProductsButton,reorderResultChanged?"Розташування змінено":"Розташування не змінено",reorderResultChanged?"success":"error"));},260);
  });
  productOrderModal?.addEventListener("click",e=>{
    if(e.target===productOrderModal){
      logAction("Вікно зміни розташування продуктів закрито без збереження.");
      closeProductOrderModal();
      requestAnimationFrame(()=>showButtonState(reorderProductsButton,"Не змінено","error"));
    }
  });
  function updateReorderState(){
    if(!grid)return;
    grid.classList.remove("reorder-mode");
    grid.querySelectorAll(".food-card").forEach(card=>{card.draggable=false;});
  }
  function attachDragEvents(){}

  function normalizeDailyGoal(value){
    const source=value&&typeof value==="object"?value:{};
    return {
      enabled:!!source.enabled,
      kcal:Math.max(0,number(source.kcal)),
      protein:Math.max(0,number(source.protein)),
      fat:Math.max(0,number(source.fat)),
      carb:Math.max(0,number(source.carb)),
      sugar:Math.max(0,number(source.sugar)),
      salt:Math.max(0,number(source.salt)),
      fiber:Math.max(0,number(source.fiber))
    };
  }
  function hasDailyGoalData(value){
    const goal=normalizeDailyGoal(value);
    return ["kcal","protein","fat","carb","sugar","salt","fiber"].some(key=>goal[key]>0);
  }

  function peekExportVersion(){
    const fingerprint=exportFingerprint();
    const previous=storedExportFingerprint();
    let version=Math.max(0,parseInt(localStorage.getItem(EXPORT_VERSION_KEY)||"0",10)||0);
    if(previous!==fingerprint)version+=1;
    return Math.max(1,version);
  }

  function readStorageJson(key,fallback=null){
    const raw=localStorage.getItem(key);
    if(raw===null)return fallback;
    try{return JSON.parse(raw);}catch(_){return fallback;}
  }

  function collectBackupSettings(){
    return {
      sort_mode:currentSort,
      random_sort_seed:localStorage.getItem(RANDOM_SORT_SEED_KEY),
      active_tab:localStorage.getItem(ACTIVE_TAB_KEY)||"blocks",
      stats_to_today:localStorage.getItem(STATS_TO_TODAY_KEY)==="1",
      site_data_visible:localStorage.getItem(SITE_DATA_VISIBLE_KEY)!=="0",
      departments_enabled:departmentsEnabled,
      category_order:getCategoryOrder(),
      custom_categories:getCustomCategories().map(({id,label})=>({id,label})),
      deleted_default_categories:getDeletedDefaultCategoryIds(),
      database_updated_at:localStorage.getItem(DATABASE_UPDATED_KEY)
    };
  }

  function exportScopeLabel(scope){
    if(scope==="blocks")return "тільки КБЖВ-блоки та їхні налаштування";
    if(scope==="archive")return "тільки КБЖВ-історію";
    if(scope==="goal")return "тільки денну ціль";
    if(scope==="profile")return "тільки дані профілю";
    return "повну резервну копію основних даних сайту";
  }

  function updateExportScopeUI(){
    const hasGoal=hasDailyGoalData(dailyGoal);
    exportScopeButtons.forEach(button=>{
      const disabled=button.dataset.scope==="goal"&&!hasGoal;
      button.disabled=disabled;
      button.classList.toggle("transfer-scope-selected",!disabled&&button.dataset.scope===exportScope);
    });

    const all=exportScope==="all";
    if(exportPreviewProducts)exportPreviewProducts.textContent=(exportScope==="archive"||exportScope==="goal"||exportScope==="profile")?"Не експортується":String(products.length);
    if(exportPreviewArchive)exportPreviewArchive.textContent=(exportScope==="blocks"||exportScope==="goal"||exportScope==="profile")?"Не експортується":String(archiveItems.length);
    if(exportPreviewCalculator)exportPreviewCalculator.textContent=all?String(calculatorItems.length):"Не експортується";
    if(exportPreviewDraft)exportPreviewDraft.textContent=all?(String(calcInput?.value||localStorage.getItem(CALCULATOR_DRAFT_KEY)||"").trim()?"Є":"Порожня"):"Не експортується";
    if(exportPreviewGoal)exportPreviewGoal.textContent=!hasGoal?"Не задана":(exportScope==="blocks"||exportScope==="archive"||exportScope==="profile")?"Не експортується":"Задана";
    if(exportPreviewProfile)exportPreviewProfile.textContent=(exportScope==="blocks"||exportScope==="archive"||exportScope==="goal")?"Не експортується":(hasProfileData()?"Задані":"Порожні");
    if(exportPreviewSettings)exportPreviewSettings.textContent=(all||exportScope==="blocks")?"Так":"Не експортуються";
  }

  function closeExportPreview(){
    exportPreviewModal?.classList.remove("active");
    document.body.classList.remove("edit-modal-open");
    pendingExport=null;
  }

  function buildExportData(version,exportedAt,scope){
    const data={
      backup_format:"kbjv-full-backup-v2",
      schema_version:2,
      version,
      exported_at:exportedAt,
      export_scope:scope
    };

    if(scope==="all"||scope==="blocks"){
      data.products=products.map((p,i)=>normalizeProduct(p,i));
      const settings=collectBackupSettings();
      data.category_order=settings.category_order;
      data.custom_categories=settings.custom_categories;
      data.deleted_default_categories=settings.deleted_default_categories;
      data.departments_enabled=settings.departments_enabled;
      if(scope==="all")data.settings=settings;
    }
    if(scope==="all"||scope==="archive")data.archive=JSON.parse(JSON.stringify(archiveItems));
    if(scope==="all"){
      data.calculator=calculatorItems.map(item=>normalizeCalculatorItem(item));
      data.calculator_draft=String(calcInput?.value??localStorage.getItem(CALCULATOR_DRAFT_KEY)??"");
      data.daily_goal=normalizeDailyGoal(dailyGoal);
      data.profile=normalizeProfile(profileData);
      data.calculator_quick_presets=normalizeQuickPresets(calculatorQuickPresets);
      data.console=JSON.parse(JSON.stringify(consoleItems));
    }else{
      if(scope==="goal")data.daily_goal=normalizeDailyGoal(dailyGoal);
      if(scope==="profile")data.profile=normalizeProfile(profileData);
    }
    return data;
  }

  function performPendingExport(){
    if(!pendingExport)return;
    const hasGoal=hasDailyGoalData(dailyGoal);
    if(exportScope==="goal"&&!hasGoal)return;

    const version=getExportVersion();
    const exportedAt=pendingExport.exportedAt;
    const data=buildExportData(version,exportedAt,exportScope);
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    const suffix=exportScope==="blocks"?"-blocks":exportScope==="archive"?"-archive":exportScope==="goal"?"-daily-goal":exportScope==="profile"?"-profile":"-full-backup";
    a.href=url;a.download=`kbjv-v${version}${suffix}.json`;
    document.body.append(a);a.click();a.remove();URL.revokeObjectURL(url);

    safeStorageSet(LAST_EXPORT_KEY,new Date().toISOString(),{critical:true});
    updateSiteDataCounts();
    closeExportPreview();
    showButtonState(exportButton,"Експортовано","success",1800);
    logAction(`Експортовано резервну копію v${version}: ${exportScopeLabel(exportScope)}.`,{scope:exportScope,version});
  }

  exportButton?.addEventListener("click",()=>{
    const version=peekExportVersion(),exportedAt=new Date().toISOString();
    exportScope="all";
    pendingExport={version,exportedAt};
    if(exportPreviewVersion)exportPreviewVersion.textContent=String(version);
    if(exportPreviewDate)exportPreviewDate.textContent=formatImportDate(exportedAt);
    updateExportScopeUI();
    exportPreviewModal?.classList.add("active");
    document.body.classList.add("edit-modal-open");
    logAction(`Вікно перевірки експорту відкрито: продуктів: ${products.length}, записів калькулятора: ${calculatorItems.length}, записів архіву: ${archiveItems.length}, версія ${version}.`);
  });
  exportScopeButtons.forEach(button=>button.addEventListener("click",()=>{
    if(button.disabled)return;
    exportScope=button.dataset.scope||"all";
    updateExportScopeUI();
    logAction(`Для експорту вибрано: ${exportScopeLabel(exportScope)}.`);
  }));
  exportPreviewCancel?.addEventListener("click",()=>{
    showButtonState(exportPreviewCancel,"Скасовано","error",550);
    logAction("Експорт скасовано після перевірки.");
    setTimeout(()=>{closeExportPreview();requestAnimationFrame(()=>showButtonState(exportButton,"Не експортовано","error"));},260);
  });
  exportPreviewConfirm?.addEventListener("click",()=>{
    if(!pendingExport||exportPreviewConfirm.disabled)return;
    exportPreviewConfirm.disabled=true;
    setTimeout(()=>{
      try{performPendingExport();}
      catch(error){console.error(error);showButtonState(exportButton,"Не експортовано","error");alert("Не вдалося створити резервну копію.");}
      finally{exportPreviewConfirm.disabled=false;}
    },260);
  });
  exportPreviewModal?.addEventListener("click",e=>{if(e.target===exportPreviewModal)exportPreviewCancel?.click();});

  let importDialogOpened=false;
  importButton?.addEventListener("click",()=>{importDialogOpened=true;importFile?.click();});
  window.addEventListener("focus",()=>{
    if(!importDialogOpened)return;
    setTimeout(()=>{
      if(importFile && (!importFile.files || importFile.files.length===0)){showButtonState(importButton,"Не імпортовано","error",1500);logAction("Імпорт бази скасовано.");}
      importDialogOpened=false;
    },200);
  });

  function formatImportDate(value){
    if(!value)return "Не вказано";const d=new Date(value);if(Number.isNaN(d.getTime()))return String(value);
    return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
  }
  function stableComparable(value){
    if(Array.isArray(value))return value.map(stableComparable);
    if(value&&typeof value==="object"){const out={};Object.keys(value).sort().forEach(k=>{if(!["created_at","updated_at"].includes(k))out[k]=stableComparable(value[k]);});return out;}
    return value;
  }
  function compareImportCollections(current,incoming,keyFn,normalizeFn=v=>v){
    const currentMap=new Map(current.map((item,i)=>[keyFn(item,i),normalizeFn(item,i)]));
    const incomingMap=new Map(incoming.map((item,i)=>[keyFn(item,i),normalizeFn(item,i)]));
    let added=0,changed=0,removed=0;
    incomingMap.forEach((value,key)=>{if(!currentMap.has(key))added++;else if(JSON.stringify(stableComparable(currentMap.get(key)))!==JSON.stringify(stableComparable(value)))changed++;});
    currentMap.forEach((_,key)=>{if(!incomingMap.has(key))removed++;});
    return {added,changed,removed};
  }
  function formatImportDiff(diff){return `+${diff.added} додано / ~${diff.changed} змінено / −${diff.removed} видалено`;}
  function productImportKey(item,index){const id=String(item?.id||"").trim();if(id)return `id:${id}`;return `name:${String(item?.name||"").trim().toLowerCase()||index}`;}
  function normalizedProductName(item){return String(item?.name||"").trim().toLocaleLowerCase("uk-UA").replace(/\s+/g," ");}
  function getOnlyNewImportedProducts(current,incoming){
    const ids=new Set(current.map(item=>String(item?.id||"").trim()).filter(Boolean));
    const names=new Set(current.map(normalizedProductName).filter(Boolean));
    const result=[];
    incoming.forEach(item=>{
      const id=String(item?.id||"").trim(),name=normalizedProductName(item);
      if((id&&ids.has(id))||(name&&names.has(name)))return;
      result.push(item);if(id)ids.add(id);if(name)names.add(name);
    });
    return result;
  }
  function archiveImportKey(item,index){const id=String(item?.id||"").trim();if(id)return `id:${id}`;return `fallback:${String(item?.date||"")}|${String(item?.text||"")}|${index}`;}
  function archiveImportSignature(item){return `${String(item?.date||"").trim()}|${String(item?.text||"").trim().replace(/\s+/g," ")}`;}
  function getOnlyNewImportedArchive(current,incoming){
    const ids=new Set(current.map(item=>String(item?.id||"").trim()).filter(Boolean));
    const signatures=new Set(current.map(archiveImportSignature).filter(Boolean));
    const result=[];
    incoming.forEach(item=>{
      const id=String(item?.id||"").trim(),signature=archiveImportSignature(item);
      if((id&&ids.has(id))||(signature&&signatures.has(signature)))return;
      result.push(item);if(id)ids.add(id);if(signature)signatures.add(signature);
    });
    return result;
  }

  function isExactIsoDate(value){
    const match=String(value||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(!match)return false;
    const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]);
    const probe=new Date(Date.UTC(year,month-1,day));
    return probe.getUTCFullYear()===year&&probe.getUTCMonth()===month-1&&probe.getUTCDate()===day;
  }

  // v89: Validate ALL legacy aliases before normalization, including nested rows.
  const BACKUP_NUTRITION_ALIASES=[
    "kcal","protein","proteins","fat","fats","carb","carbs",
    "sugar","sugars","salt","fiber","fibre"
  ];
  function backupNumber(value){
    if(value===undefined||value===null||value==="")return 0;
    const n=Number(String(value).trim().replace(",","."));
    return Number.isFinite(n)?n:0;
  }
  function isValidBackupNumber(value,{positive=false}={}){
    if(value===undefined||value===null||value==="")return !positive;
    if(typeof value!=="number"&&typeof value!=="string")return false;
    if(typeof value==="string"&&!value.trim())return false;
    const n=backupNumber(value);
    return Number.isFinite(Number(String(value).trim().replace(",",".")))&&(positive?n>0:n>=0);
  }
  function validBackupNutrition(item,{weight=false}={}){
    if(!item||typeof item!=="object"||Array.isArray(item))return false;
    if(BACKUP_NUTRITION_ALIASES.some(key=>!isValidBackupNumber(item[key])))return false;
    for(const [a,b] of [["protein","proteins"],["fat","fats"],["carb","carbs"],["sugar","sugars"],["fiber","fibre"]]){
      if(item[a]!==undefined&&item[a]!==null&&item[b]!==undefined&&item[b]!==null&&backupNumber(item[a])!==backupNumber(item[b]))return false;
    }
    if(weight&&!isValidBackupNumber(item.weight))return false;
    if(item.display!==undefined&&item.display!==null){
      if(typeof item.display!=="object"||Array.isArray(item.display))return false;
      if(BACKUP_NUTRITION_ALIASES.some(key=>!isValidBackupNumber(item.display[key])))return false;
    }
    return true;
  }
  function isValidImportProduct(item){
    if(!validBackupNutrition(item)||!String(item.name??"").trim())return false;
    // A display-only number must never contradict the value used by totals.
    if(item.display){
      const canonical={
        kcal:item.kcal, protein:item.protein??item.proteins, fat:item.fat??item.fats,
        carb:item.carb??item.carbs, sugar:item.sugar??item.sugars,
        salt:item.salt, fiber:item.fiber??item.fibre
      };
      for(const key of Object.keys(canonical)){
        if(item.display[key]===undefined||item.display[key]===null||item.display[key]==="")continue;
        if(backupNumber(item.display[key])!==backupNumber(canonical[key]))return false;
      }
    }
    const weights=item.quick_weights??item.quickWeights;
    if(weights!==undefined){
      if(!Array.isArray(weights)||weights.length>4||weights.some(n=>!isValidBackupNumber(n,{positive:true})))return false;
      if(new Set(weights.map(n=>Number(String(n).replace(",",".")))).size!==weights.length)return false;
    }
    return true;
  }
  function validateImportCategoryList(items,label){
    if(items===undefined)return null;
    if(!Array.isArray(items))throw new Error(`У резервній копії пошкоджено «${label}». Дані не змінено.`);
    if(items.some(item=>!normalizeCustomCategoryItem(item)||String(item.label).trim().length>40))
      throw new Error(`У резервній копії є некоректні власні відділи «${label}». Дані не змінено.`);
    const normalized=items.map(normalizeCustomCategoryItem);
    if(new Set(normalized.map(item=>item.id)).size!==normalized.length)
      throw new Error(`У «${label}» повторюються ідентифікатори відділів. Дані не змінено.`);
    return normalized;
  }
  function validateImportSettings(settings){
    if(!settings)return;
    for(const key of ["category_order","deleted_default_categories"]){
      if(settings[key]!==undefined&&(!Array.isArray(settings[key])||settings[key].some(value=>typeof value!=="string")))
        throw new Error(`У резервній копії пошкоджене налаштування «${key}».`);
    }
    for(const key of ["departments_enabled","stats_to_today","site_data_visible"]){
      if(settings[key]!==undefined&&typeof settings[key]!=="boolean")
        throw new Error(`У резервній копії пошкоджене налаштування «${key}».`);
    }
    if(settings.sort_mode!==undefined&&!VALID_SORT_MODES.has(settings.sort_mode))
      throw new Error("У резервній копії вказано невідомий режим сортування.");
    if(settings.active_tab!==undefined&&!(["blocks","calculator","archive","console"].includes(settings.active_tab)))
      throw new Error("У резервній копії некоректна активна вкладка.");
    validateImportCategoryList(settings.custom_categories,"settings.custom_categories");
  }
  function normalizeImportedArchiveItem(item,index){
    if(!item||typeof item!=="object"||Array.isArray(item))return null;
    const date=String(item.date||"").trim();
    if(!isExactIsoDate(date))return null;
    if(typeof item.text!=="string"||!item.text.trim())return null;
    const text=item.text;
    if(item.comment!==undefined&&item.comment!==null&&typeof item.comment!=="string")return null;
    if(!validBackupNutrition(item))return null;
    if(item.composition!==undefined && !Array.isArray(item.composition))return null;
    if(Array.isArray(item.composition)&&item.composition.some(row=>
      !validBackupNutrition(row,{weight:true})||!String(row.text??row.name??"").trim()
    ))return null;
    const composition=Array.isArray(item.composition)?item.composition.map(row=>({...row})):[];
    const createdRaw=String(item.created_at||"");
    if(item.created_at!==undefined&&item.created_at!==null&&item.created_at!==""&&Number.isNaN(Date.parse(createdRaw)))return null;
    const createdAt=!Number.isNaN(Date.parse(createdRaw))?new Date(createdRaw).toISOString():`${date}T12:00:00.000Z`;
    return {
      id:String(item.id||createId(`archive-import-${index}`)),date,text,
      comment:String(item.comment||""),
      kcal:backupNumber(item.kcal),protein:backupNumber(item.protein??item.proteins),fat:backupNumber(item.fat??item.fats),carb:backupNumber(item.carb??item.carbs),
      sugar:backupNumber(item.sugar??item.sugars),salt:backupNumber(item.salt),fiber:backupNumber(item.fiber??item.fibre),composition,created_at:createdAt
    };
  }

  function validateBackupEnvelope(parsed,isOldArray){
    if(isOldArray)return;
    if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))throw new Error("Некоректна структура резервної копії.");
    if(parsed.backup_format&&parsed.backup_format!=="kbjv-full-backup-v2")throw new Error("Непідтримуваний формат резервної копії.");
    if(parsed.schema_version!==undefined){
      const schema=Number(parsed.schema_version);
      if(!Number.isInteger(schema)||schema<0)throw new Error("Пошкоджено версію формату резервної копії.");
      if(schema>2)throw new Error("Цю резервну копію створено новішою версією сайту.");
    }
  }

  function updateImportScopeUI(){
    if(!pendingImport)return;
    const {hasProducts,hasArchive,hasGoal,hasProfile,hasCalculator,hasDraft,hasSettings,hasConsole,normalized,importedArchive,importedCalculator,productDiff,archiveDiff}=pendingImport;
    const canAll=hasProducts&&hasArchive;

    importScopeButtons.forEach(button=>{
      const scope=button.dataset.scope;
      const disabled=(scope==="all"&&!canAll)||(scope==="blocks"&&!hasProducts)||(scope==="new-blocks"&&!hasProducts)||(scope==="archive"&&!hasArchive)||(scope==="new-archive"&&!hasArchive)||(scope==="goal"&&!hasGoal)||(scope==="profile"&&!hasProfile);
      button.disabled=disabled;
      button.classList.toggle("transfer-scope-selected",!disabled&&scope===importScope);
    });

    if(importPreviewProducts)importPreviewProducts.textContent=hasProducts?String(normalized.length):"Не містить блоків";
    if(importPreviewArchive)importPreviewArchive.textContent=hasArchive?String(importedArchive.length):"Не містить архіву";
    if(importPreviewCalculator)importPreviewCalculator.textContent=hasCalculator?String(importedCalculator.length):"Не містить калькулятора";
    if(importPreviewDraft)importPreviewDraft.textContent=hasDraft?(String(pendingImport.importedDraft||"").trim()?"Є":"Порожня"):"Не містить чернетки";
    if(importPreviewGoal)importPreviewGoal.textContent=hasGoal?"Є":"Не містить денної цілі";
    if(importPreviewProfile)importPreviewProfile.textContent=hasProfile?"Містить дані профілю":"Не містить профілю";
    if(importPreviewSettings)importPreviewSettings.textContent=(hasSettings||hasConsole)?"Є":"Не містить";

    if(importPreviewProductsDiff){
      if(!hasProducts)importPreviewProductsDiff.textContent="Недоступно";
      else if(importScope==="archive"||importScope==="new-archive"||importScope==="goal"||importScope==="profile")importPreviewProductsDiff.textContent="Не імпортується";
      else if(importScope==="new-blocks"){
        const onlyNew=getOnlyNewImportedProducts(products,normalized);
        importPreviewProductsDiff.textContent=`+${onlyNew.length} нових / ${normalized.length-onlyNew.length} вже є`;
      }else importPreviewProductsDiff.textContent=formatImportDiff(productDiff);
    }
    if(importPreviewArchiveDiff){
      if(!hasArchive)importPreviewArchiveDiff.textContent="Недоступно";
      else if(importScope==="blocks"||importScope==="new-blocks"||importScope==="goal"||importScope==="profile")importPreviewArchiveDiff.textContent="Не імпортується";
      else if(importScope==="new-archive"){
        const onlyNewArchive=getOnlyNewImportedArchive(archiveItems,importedArchive);
        importPreviewArchiveDiff.textContent=`+${onlyNewArchive.length} нових / ${importedArchive.length-onlyNewArchive.length} вже є`;
      }else importPreviewArchiveDiff.textContent=formatImportDiff(archiveDiff);
    }
    if(importPreviewConfirm){
      const label=(importScope==="new-blocks"||importScope==="new-archive")?"Додати":"Імпортувати";
      importPreviewConfirm.textContent=label;importPreviewConfirm.dataset.originalText=label;
    }
  }

  function closeImportPreview(){
    importPreviewModal?.classList.remove("active");document.body.classList.remove("edit-modal-open");pendingImport=null;
  }

  function applyImportedSettings(settings){
    if(!settings||typeof settings!=="object")return;
    if(Array.isArray(settings.custom_categories))saveCustomCategories(settings.custom_categories.map(normalizeCustomCategoryItem).filter(Boolean));
    if(Array.isArray(settings.deleted_default_categories))saveDeletedDefaultCategoryIds(settings.deleted_default_categories);
    populateProductCategorySelects();
    if(Array.isArray(settings.category_order))saveCategoryOrder(settings.category_order);
    if(typeof settings.departments_enabled==="boolean")saveDepartmentsEnabled(settings.departments_enabled);
    if(VALID_SORT_MODES.has(String(settings.sort_mode||""))){currentSort=String(settings.sort_mode);if(!departmentsEnabled&&currentSort==="categories")currentSort="initial";safeStorageSet(SORT_KEY,currentSort,{critical:true});markLocalDataChanged();}
    if(settings.random_sort_seed===null||settings.random_sort_seed===undefined)safeStorageRemove(RANDOM_SORT_SEED_KEY);else safeStorageSet(RANDOM_SORT_SEED_KEY,String(settings.random_sort_seed),{critical:true});markLocalDataChanged();
    if(typeof settings.stats_to_today==="boolean"){statsToTodayEnabled=settings.stats_to_today;safeStorageSet(STATS_TO_TODAY_KEY,statsToTodayEnabled?"1":"0",{critical:true});markLocalDataChanged();}
    if(typeof settings.site_data_visible==="boolean"){siteDataVisible=settings.site_data_visible;safeStorageSet(SITE_DATA_VISIBLE_KEY,siteDataVisible?"1":"0",{critical:true});markLocalDataChanged();}
    if(typeof settings.active_tab==="string")safeStorageSet(ACTIVE_TAB_KEY,settings.active_tab);
    if(settings.database_updated_at){safeStorageSet(DATABASE_UPDATED_KEY,String(settings.database_updated_at),{critical:true});markLocalDataChanged();}
    updateSortOptionState();
  }

  function applyPendingImport(){
    if(!pendingImport)return;
    const p=pendingImport;
    const appendOnlyNew=importScope==="new-blocks";
    const appendOnlyNewArchive=importScope==="new-archive";
    const importProducts=importScope==="all"||importScope==="blocks"||appendOnlyNew;
    const importArchive=importScope==="all"||importScope==="archive"||appendOnlyNewArchive;
    const importGoal=(importScope==="goal")||(importScope==="all"&&p.hasGoal);
    const importProfile=(importScope==="profile")||(importScope==="all"&&p.hasProfile);
    const importAllExtras=importScope==="all";

    if((importProducts&&!p.hasProducts)||(importArchive&&!p.hasArchive)||(importGoal&&!p.hasGoal)||(importProfile&&!p.hasProfile))return;

    const newProducts=appendOnlyNew?getOnlyNewImportedProducts(products,p.normalized):[];
    const newArchiveItems=appendOnlyNewArchive?getOnlyNewImportedArchive(archiveItems,p.importedArchive):[];
    if(appendOnlyNew&&!newProducts.length){closeImportPreview();showButtonState(importButton,"Нових немає","info");logAction("Імпорт нових КБЖВ-блоків завершено: усі продукти з файлу вже є в базі.");if(importFile)importFile.value="";importDialogOpened=false;return;}
    if(appendOnlyNewArchive&&!newArchiveItems.length){closeImportPreview();showButtonState(importButton,"Нової історії немає","info");logAction("Імпорт нової КБЖВ-історії завершено: усі записи з файлу вже є в архіві.");if(importFile)importFile.value="";importDialogOpened=false;return;}

    const description=importScope==="blocks"?"Імпорт КБЖВ-блоків":appendOnlyNew?"Додавання нових КБЖВ-блоків":importScope==="archive"?"Імпорт КБЖВ-архіву":appendOnlyNewArchive?"Додавання нової КБЖВ-історії":importScope==="goal"?"Імпорт денної цілі КБЖВ":importScope==="profile"?"Імпорт даних профілю":"Повне відновлення сайту з резервної копії";
    beginStorageTransaction(description);
    saveUndoSnapshot(description);

    if(importProducts){
      products=appendOnlyNew?[...products,...newProducts]:p.normalized;
      if(appendOnlyNew){
        if(Array.isArray(p.importedCustomCategories)){
          const existing=getCustomCategories(),ids=new Set(existing.map(item=>item.id)),labels=new Set(existing.map(item=>normalizeCategorySearch(item.label))),merged=[...existing];
          p.importedCustomCategories.forEach(item=>{if(ids.has(item.id)||labels.has(normalizeCategorySearch(item.label)))return;merged.push(item);ids.add(item.id);labels.add(normalizeCategorySearch(item.label));});
          saveCustomCategories(merged);
          if(Array.isArray(p.importedCategoryOrder))saveCategoryOrder([...getCategoryOrder(),...p.importedCategoryOrder]);
        }
      }else{
        if(importAllExtras&&p.hasSettings)applyImportedSettings(p.importedSettings);
        else{
          if(Array.isArray(p.importedCustomCategories))saveCustomCategories(p.importedCustomCategories);
          if(Array.isArray(p.importedDeletedDefaultCategories))saveDeletedDefaultCategoryIds(p.importedDeletedDefaultCategories);
          populateProductCategorySelects();
          if(Array.isArray(p.importedCategoryOrder))saveCategoryOrder(p.importedCategoryOrder);
          if(p.importedDepartmentsEnabled!==null)saveDepartmentsEnabled(p.importedDepartmentsEnabled);
        }
      }
      populateProductCategorySelects();saveProductsLocal();
    }
    if(importArchive){archiveItems=appendOnlyNewArchive?[...archiveItems,...newArchiveItems]:p.importedArchive;saveArchiveLocal();}
    if(importGoal){dailyGoal=normalizeDailyGoal(p.importedGoal);safeStorageSet(DAILY_GOAL_KEY,JSON.stringify(dailyGoal),{critical:true});markLocalDataChanged();dailyGoalSettingsOpen=false;for(const key of Object.keys(goalInputs))if(goalInputs[key])goalInputs[key].value=dailyGoal[key]||"";renderDailyGoal();}
    if(importProfile){profileData=normalizeProfile(p.importedProfile);saveProfileLocal();}

    if(importAllExtras){
      if(p.hasSettings&&p.importedSettings?.database_updated_at)safeStorageSet(DATABASE_UPDATED_KEY,String(p.importedSettings.database_updated_at),{critical:true});
      if(p.hasCalculator){calculatorItems=p.importedCalculator.map(normalizeCalculatorItem);saveCalculatorLocal();renderCalculatorLog();updateTotals();}
      if(p.hasDraft){if(calcInput)calcInput.value=p.importedDraft;if(p.importedDraft)safeStorageSet(CALCULATOR_DRAFT_KEY,p.importedDraft,{critical:true});else safeStorageRemove(CALCULATOR_DRAFT_KEY);markLocalDataChanged();}
      if(Array.isArray(p.importedQuickPresets)){calculatorQuickPresets=normalizeQuickPresets(p.importedQuickPresets);saveCalculatorQuickPresets();}
      if(p.hasSettings&&!importProducts)applyImportedSettings(p.importedSettings);
      if(p.hasConsole){consoleItems=p.importedConsole.map(item=>({id:String(item?.id||createId("console")),time:String(item?.time||new Date().toISOString()),message:String(item?.message||"")}));saveConsoleLocal();renderConsole();}
    }

    if(importScope==="all"&&p.hasProducts&&p.hasArchive&&!Array.isArray(p.parsed)&&Number.isFinite(Number(p.parsed.version))){
      safeStorageSet(EXPORT_VERSION_KEY,String(Math.max(1,Number(p.parsed.version))),{critical:true});
      safeStorageSet(EXPORT_FINGERPRINT_KEY,exportFingerprint(),{critical:true});
    }

    renderProducts(searchInput?.value||"");renderArchive();renderStatistics();updateSiteDataCounts();
    safeStorageSet(LAST_IMPORT_KEY,new Date().toISOString(),{critical:true});
    if(!finishStorageTransaction()){
      reloadPrimaryStateFromStorage();closeImportPreview();showButtonState(importButton,"Не імпортовано","error",1500);
      if(importFile)importFile.value="";importDialogOpened=false;
      alert("Імпорт скасовано без змін: недостатньо місця або браузер не дозволив повністю записати дані.");
      return;
    }
    updateSiteDataCounts();

    const importedParts=[];
    if(importProducts)importedParts.push(appendOnlyNew?`${newProducts.length} нових КБЖВ-блоків`:`КБЖВ-блоків: ${products.length}`);
    if(importArchive)importedParts.push(appendOnlyNewArchive?`${newArchiveItems.length} нових записів КБЖВ-історії`:`записів КБЖВ-архіву: ${archiveItems.length}`);
    if(importAllExtras&&p.hasCalculator)importedParts.push(`записів калькулятора: ${calculatorItems.length}`);
    if(importAllExtras&&p.hasDraft)importedParts.push("чернетку калькулятора");
    if(importGoal)importedParts.push("денну ціль");if(importProfile)importedParts.push("дані профілю");
    if(importAllExtras&&p.hasSettings)importedParts.push("налаштування");if(importAllExtras&&p.hasConsole)importedParts.push("локальну консоль");
    closeImportPreview();showButtonState(importButton,"Імпортовано","success",1500);logAction(`Імпортовано: ${importedParts.join(", ")}.`,{scope:importScope,backup_format:p.parsed?.backup_format||"legacy"});
    if(importFile)importFile.value="";importDialogOpened=false;
  }

  importPreviewCancel?.addEventListener("click",()=>{
    closeImportPreview();if(importFile)importFile.value="";importDialogOpened=false;showButtonState(importButton,"Не імпортовано","error",1500);showButtonState(importPreviewCancel,"Скасовано","error",1000);logAction("Імпорт скасовано після перевірки файлу.");
  });
  importScopeButtons.forEach(button=>button.addEventListener("click",()=>{
    if(button.disabled)return;importScope=button.dataset.scope||"all";updateImportScopeUI();
    const importLabel=importScope==="blocks"?"тільки КБЖВ-блоки":importScope==="new-blocks"?"додати тільки нові КБЖВ-блоки":importScope==="archive"?"тільки КБЖВ-історію":importScope==="new-archive"?"додати тільки нову КБЖВ-історію":importScope==="goal"?"тільки денну ціль":importScope==="profile"?"тільки дані профілю":"усі доступні дані";
    logAction(`Для імпорту вибрано: ${importLabel}.`);
  }));
  importPreviewConfirm?.addEventListener("click",()=>{
    if(!pendingImport||importPreviewConfirm.disabled)return;
    importPreviewConfirm.disabled=true;
    // Only applyPendingImport may display success after the storage transaction.
    setTimeout(()=>{
      try{applyPendingImport();}
      catch(error){
        console.error(error);
        if(storageTransaction)rollbackStorageTransaction();
        reloadPrimaryStateFromStorage();
        closeImportPreview();
        showButtonState(importButton,"Не імпортовано","error");
        alert("Помилка під час відновлення резервної копії. Перевірте дані та сховище.");
      }
      finally{importPreviewConfirm.disabled=false;}
    },260);
  });
  importPreviewModal?.addEventListener("click",e=>{if(e.target===importPreviewModal)importPreviewCancel?.click();});

  importFile?.addEventListener("change",async()=>{
    const file=importFile.files?.[0];if(!file)return;
    try{
      if(file.size>15*1024*1024)throw new Error("Файл резервної копії перевищує 15 МБ.");
      const parsed=JSON.parse(await file.text());
      const isOldArray=Array.isArray(parsed);
      validateBackupEnvelope(parsed,isOldArray);
      const hasProducts=isOldArray||(!isOldArray&&Array.isArray(parsed.products));
      const hasArchive=!isOldArray&&Array.isArray(parsed.archive);
      if(!isOldArray){
        for(const [key,valid] of [
          ["products",v=>Array.isArray(v)],["archive",v=>Array.isArray(v)],
          ["console",v=>Array.isArray(v)],["calculator_quick_presets",v=>Array.isArray(v)],
          ["profile",v=>v&&typeof v==="object"&&!Array.isArray(v)],
          ["daily_goal",v=>v&&typeof v==="object"&&!Array.isArray(v)],
          ["settings",v=>v&&typeof v==="object"&&!Array.isArray(v)]
        ]){
          if(Object.prototype.hasOwnProperty.call(parsed,key)&&!valid(parsed[key])){
            throw new Error(`Пошкоджена структура «${key}» у резервній копії. Дані не змінено.`);
          }
        }
      }
      const hasGoal=!isOldArray&&parsed.daily_goal&&typeof parsed.daily_goal==="object";
      const hasProfile=!isOldArray&&parsed.profile&&typeof parsed.profile==="object"&&!Array.isArray(parsed.profile);
      const hasCalculator=!isOldArray&&Array.isArray(parsed.calculator);
      if(!isOldArray&&Object.prototype.hasOwnProperty.call(parsed,"calculator")&&!hasCalculator)throw new Error("У резервній копії некоректна структура калькулятора.");
      const hasDraft=!isOldArray&&Object.prototype.hasOwnProperty.call(parsed,"calculator_draft");
      const hasSettings=!isOldArray&&parsed.settings&&typeof parsed.settings==="object"&&!Array.isArray(parsed.settings);
      const hasConsole=!isOldArray&&Array.isArray(parsed.console);
      if(!hasProducts&&!hasArchive&&!hasGoal&&!hasProfile&&!hasCalculator&&!hasDraft&&!hasSettings&&!hasConsole)throw new Error("Некоректний формат");

      const rawProducts=hasProducts?(isOldArray?parsed:parsed.products):[];
      if(hasProducts&&rawProducts.some(p=>!isValidImportProduct(p)))
        throw new Error("Файл містить некоректні або від’ємні показники продуктів. Дані не змінено.");
      const normalized=hasProducts?rawProducts.map((p,i)=>normalizeProduct(p,i)).filter(p=>p.name):[];
      const importedArchive=hasArchive?parsed.archive.map(normalizeImportedArchiveItem).filter(Boolean):[];
      if(hasArchive&&importedArchive.length!==parsed.archive.length)throw new Error("Архів у резервній копії містить пошкоджені записи.");
      if(hasCalculator&&parsed.calculator.some(item=>!isValidCalculatorItem(item)))throw new Error("Резервна копія містить пошкоджені або від’ємні записи калькулятора.");
      const importedGoal=hasGoal?normalizeDailyGoal(parsed.daily_goal):null;
      if(hasProfile)validateImportedProfile(parsed.profile);
      const importedProfile=hasProfile?normalizeProfile(parsed.profile):null;
      const importedCalculator=hasCalculator?parsed.calculator.map(normalizeCalculatorItem).filter(Boolean):[];
      const importedDraft=hasDraft?String(parsed.calculator_draft??""):"";
      const importedSettings=hasSettings?parsed.settings:null;
      if(hasSettings)validateImportSettings(importedSettings);
      if(hasGoal&&(!validBackupNutrition(parsed.daily_goal)||
        (parsed.daily_goal.enabled!==undefined&&typeof parsed.daily_goal.enabled!=="boolean")))
        throw new Error("У резервній копії некоректна денна ціль.");
      if(hasDraft&&typeof parsed.calculator_draft!=="string")
        throw new Error("У резервній копії пошкоджена чернетка калькулятора.");
      const importedConsole=hasConsole?parsed.console:[];
      if(hasConsole&&importedConsole.length>MAX_CONSOLE_ITEMS)
        throw new Error("У резервній копії понад 500 записів консолі: повне відновлення неможливе без обрізання.");
      if(hasConsole&&importedConsole.some(item=>!item||typeof item!=="object"||Array.isArray(item)||
        typeof item.message!=="string"||
        (item.id!==undefined&&typeof item.id!=="string")||
        (item.time!==undefined&&typeof item.time!=="string")))
        throw new Error("У резервній копії пошкоджена історія локальної консолі.");
      const importedQuickPresets=(!isOldArray&&Array.isArray(parsed.calculator_quick_presets))?normalizeQuickPresets(parsed.calculator_quick_presets):null;
      if(importedQuickPresets&&importedQuickPresets.length!==parsed.calculator_quick_presets.length)throw new Error("Резервна копія містить некоректні швидкі значення КБЖВ.");
      if(!isOldArray){
        for(const key of ["category_order","deleted_default_categories"]){
          if(parsed[key]!==undefined&&(!Array.isArray(parsed[key])||parsed[key].some(value=>typeof value!=="string")))
            throw new Error(`У резервній копії пошкоджено «${key}».`);
        }
        if(parsed.departments_enabled!==undefined&&typeof parsed.departments_enabled!=="boolean")
          throw new Error("У резервній копії пошкоджено прапорець відділів.");
      }
      const importedCategoryOrder=(!isOldArray&&Array.isArray(parsed.category_order))?[...parsed.category_order]:hasSettings&&Array.isArray(importedSettings.category_order)?[...importedSettings.category_order]:null;
      const importedCustomCategories=!isOldArray&&parsed.custom_categories!==undefined
        ?validateImportCategoryList(parsed.custom_categories,"custom_categories")
        :hasSettings?validateImportCategoryList(importedSettings.custom_categories,"settings.custom_categories"):null;
      const importedDeletedDefaultCategories=(!isOldArray&&Array.isArray(parsed.deleted_default_categories))?[...parsed.deleted_default_categories]:hasSettings&&Array.isArray(importedSettings.deleted_default_categories)?[...importedSettings.deleted_default_categories]:null;
      const importedDepartmentsEnabled=(!isOldArray&&typeof parsed.departments_enabled==="boolean")?parsed.departments_enabled:hasSettings&&typeof importedSettings.departments_enabled==="boolean"?importedSettings.departments_enabled:null;
      const productDiff=hasProducts?compareImportCollections(products,rawProducts,productImportKey,(item,i)=>normalizeProduct(item,i)):null;
      const archiveDiff=hasArchive?compareImportCollections(archiveItems,importedArchive,archiveImportKey,item=>item):null;

      pendingImport={parsed,normalized,hasProducts,hasArchive,hasGoal,hasProfile,hasCalculator,hasDraft,hasSettings,hasConsole,importedArchive,importedGoal,importedProfile,importedCalculator,importedDraft,importedSettings,importedConsole,importedQuickPresets,importedCategoryOrder,importedCustomCategories,importedDeletedDefaultCategories,importedDepartmentsEnabled,productDiff,archiveDiff};
      importScope=hasProducts&&hasArchive?"all":hasProducts?"blocks":hasArchive?"archive":hasGoal?"goal":hasProfile?"profile":"all";

      if(importPreviewVersion)importPreviewVersion.textContent=!isOldArray&&parsed.version!=null?String(parsed.version):"Не вказано";
      if(importPreviewDate)importPreviewDate.textContent=!isOldArray?formatImportDate(parsed.exported_at):"Не вказано";
      updateImportScopeUI();importPreviewModal?.classList.add("active");document.body.classList.add("edit-modal-open");
      const fileContents=[hasProducts?`блоків: ${normalized.length}`:null,hasArchive?`записів архіву: ${importedArchive.length}`:null,hasCalculator?`записів калькулятора: ${importedCalculator.length}`:null,hasDraft?"чернетка калькулятора":null,hasGoal?"денна ціль":null,hasProfile?"дані профілю":null,hasSettings?"налаштування":null,hasConsole?"локальна консоль":null].filter(Boolean).join(", ");
      logAction(`Файл імпорту перевірено: ${fileContents}. Очікується вибір типу імпорту та підтвердження.`);
    }catch(e){
      console.error(e);pendingImport=null;showButtonState(importButton,"Не імпортовано","error",1500);logAction("Помилка перевірки файлу імпорту.");alert(`Не вдалося імпортувати базу.\n\n${e?.message||"Перевірте JSON-файл."}`);if(importFile)importFile.value="";importDialogOpened=false;
    }
  });

  function loadDailyGoal(){
    try{const raw=JSON.parse(localStorage.getItem(DAILY_GOAL_KEY)||"null");if(raw&&typeof raw==="object")dailyGoal={...dailyGoal,...raw};}catch(_){}
    
    for(const key of Object.keys(goalInputs))if(goalInputs[key])goalInputs[key].value=dailyGoal[key]||"";
    renderDailyGoal();
  }
  function renderDailyGoal(){
    if(dailyGoalContent)dailyGoalContent.classList.toggle("goal-disabled",!dailyGoal.enabled);
    if(dailyGoalToggle){
      dailyGoalToggle.textContent=dailyGoal.enabled?"Вимкнути":"Увімкнути";
      dailyGoalToggle.dataset.originalText=dailyGoalToggle.textContent;
      dailyGoalToggle.classList.toggle("is-enabled",!!dailyGoal.enabled);
    }
    if(dailyGoalSettings)dailyGoalSettings.classList.toggle("is-collapsed",!dailyGoalSettingsOpen);
    if(dailyGoalDetailsToggle){
      dailyGoalDetailsToggle.textContent=dailyGoalSettingsOpen?"Сховати налаштування":"Показати налаштування";
      dailyGoalDetailsToggle.dataset.originalText=dailyGoalDetailsToggle.textContent;
    }
    updateDailyGoalRemaining();
  }
  function getDailyGoalActual(){return {kcal:number(kcalElement?.textContent),protein:number(proteinElement?.textContent),fat:number(fatElement?.textContent),carb:number(carbElement?.textContent),sugar:number(sugarElement?.textContent),salt:number(saltElement?.textContent),fiber:number(fiberElement?.textContent)};}
  function updateDailyGoalRemaining(){
    if(!dailyGoal.enabled)return;
    const actual=getDailyGoalActual();
    for(const key of Object.keys(remainElements)){
      const el=remainElements[key];if(!el)continue;
      const target=number(dailyGoal[key]);
      const remaining=target-actual[key];
      el.textContent=formatNumber(remaining);
      el.classList.toggle("goal-exceeded",remaining<0);
      const fill=progressElements[key],label=progressLabels[key];
      if(fill){
        const ratio=target>0?actual[key]/target:0;
        fill.style.width=`${Math.max(0,Math.min(100,ratio*80))}%`;
        fill.classList.toggle("goal-progress-over",target>0&&actual[key]>target);
      }
      if(label)label.textContent=`${formatNumber(actual[key])} / ${formatNumber(target)}${key==="kcal"?"":" г"}`;
    }
  }
  dailyGoalToggle?.addEventListener("click",()=>{
    saveUndoSnapshot(dailyGoal.enabled?"Вимкнення денної цілі КБЖВ":"Увімкнення денної цілі КБЖВ");
    dailyGoal.enabled=!dailyGoal.enabled;
    const hasSavedTargets=Object.keys(goalInputs).some(key=>number(dailyGoal[key])>0);
    if(dailyGoal.enabled&&!hasSavedTargets)dailyGoalSettingsOpen=true;
    if(!dailyGoal.enabled)dailyGoalSettingsOpen=false;
    if(!persistUserChange("Зміна денної цілі",()=>safeStorageSet(DAILY_GOAL_KEY,JSON.stringify(dailyGoal),{critical:true}))){
      reloadPrimaryStateFromStorage();showButtonState(dailyGoalToggle,"Не збережено","error",1500);return;
    }
    renderDailyGoal();
    showButtonState(dailyGoalToggle,dailyGoal.enabled?"Увімкнено":"Вимкнено",dailyGoal.enabled?"success":"error",1200);
    logAction(dailyGoal.enabled?"Денні цілі КБЖВ увімкнено.":"Денні цілі КБЖВ вимкнено.",{daily_goal:normalizeDailyGoal(dailyGoal)});
  });
  dailyGoalSave?.addEventListener("click",()=>{for(const key of Object.keys(goalInputs)){const raw=String(goalInputs[key]?.value??"").trim().replace(",",".");if(raw&&(!Number.isFinite(Number(raw))||Number(raw)<0)){showButtonState(dailyGoalSave,"Некоректне КБЖВ","error",1800);return;}}saveUndoSnapshot("Зміна денної цілі КБЖВ");for(const key of Object.keys(goalInputs))dailyGoal[key]=Math.max(0,number(goalInputs[key]?.value));if(!persistUserChange("Зміна денної цілі",()=>safeStorageSet(DAILY_GOAL_KEY,JSON.stringify(dailyGoal),{critical:true}))){reloadPrimaryStateFromStorage();showButtonState(dailyGoalSave,"Не збережено","error",1500);return;}dailyGoalSettingsOpen=false;renderDailyGoal();showButtonState(dailyGoalSave,"Цілі збережено","success",1400);logAction(`Денні цілі КБЖВ збережено: ${formatNumber(dailyGoal.kcal)} ккал / ${formatNumber(dailyGoal.protein)} білка / ${formatNumber(dailyGoal.fat)} жирів / ${formatNumber(dailyGoal.carb)} вуглеводів / ${formatNumber(dailyGoal.sugar)} цукрів / ${formatNumber(dailyGoal.salt)} солі / ${formatNumber(dailyGoal.fiber)} клітковини.`,{daily_goal:normalizeDailyGoal(dailyGoal)});});
  dailyGoalDetailsToggle?.addEventListener("click",()=>{dailyGoalSettingsOpen=!dailyGoalSettingsOpen;renderDailyGoal();showButtonState(dailyGoalDetailsToggle,dailyGoalSettingsOpen?"Відкрито":"Закрито","success",900);logAction(dailyGoalSettingsOpen?"Налаштування денної цілі відкрито.":"Налаштування денної цілі закрито.");});
  dailyGoalCopyRemaining?.addEventListener("click",async()=>{
    if(!dailyGoal.enabled){showButtonState(dailyGoalCopyRemaining,"Ціль вимкнена","error",1400);logAction("Копіювання залишку не виконано: денна ціль вимкнена.");return;}
    const actual=getDailyGoalActual();
    const r={};for(const key of Object.keys(actual))r[key]=number(dailyGoal[key])-actual[key];
    const text=`Залишилось до денної цілі: ${formatNumber(r.kcal)} калорій / ${formatNumber(r.protein)} білка / ${formatNumber(r.fat)} жирів / ${formatNumber(r.carb)} вуглеводів / ${formatNumber(r.sugar)} цукрів / ${formatNumber(r.salt)} солі / ${formatNumber(r.fiber)} клітковини`;
    if(await copyText(text)){showButtonState(dailyGoalCopyRemaining,"Скопійовано","success",1400);logAction("Залишок до денної цілі скопійовано.");}else showButtonState(dailyGoalCopyRemaining,"Не скопійовано","error",1200);
  });

  function calculatorNumber(value){
    if(typeof value==="number")return Number.isFinite(value)?value:0;
    const normalized=String(value??"").trim().replace(/\s+/g,"").replace(",",".");
    const n=Number(normalized);
    return Number.isFinite(n)?n:0;
  }

  function extractCalculatorNutrition(text){
    const source=String(text||"").replace(/\u00A0/g," ").replace(/\u2212/g,"-").trim();
    if(!source)return null;

    const numeric=String.raw`(?<![\d.,])([+-]?(?:\d{1,3}(?:[ \u00A0\u202F]\d{3})+|\d+)(?:[.,]\d+)?)`;
    const get=(labels)=>{
      for(const label of labels){
        const match=source.match(new RegExp(numeric+String.raw`\s*`+label,"i"));
        if(match)return calculatorNumber(match[1]);
      }
      return null;
    };

    // Each nutrient is extracted independently by its label.
    // One unusual word/spacing elsewhere in the line can no longer zero out fats or another macro.
    const kcal=get([
      String.raw`(?:ккал|калор(?:ій|ії|ія|ійність)?)`
    ]);
    const protein=get([
      String.raw`(?:г(?:рам(?:ів|и|а)?)?\s*)?(?:білка|білку|білків|білок)`
    ]);
    const fat=get([
      String.raw`(?:г(?:рам(?:ів|и|а)?)?\s*)?(?:жирів|жиру|жири|жир)`
    ]);
    const carb=get([
      String.raw`(?:г(?:рам(?:ів|и|а)?)?\s*)?(?:вуглеводів|вуглеводи|вуглеводу)`
    ]);
    const sugar=get([
      String.raw`(?:г(?:рам(?:ів|и|а)?)?\s*)?(?:цукрів|цукру|цукри|цукор)`
    ]);
    const salt=get([
      String.raw`(?:г(?:рам(?:ів|и|а)?)?\s*)?(?:солі|сіль)`
    ]);
    const fiber=get([
      String.raw`(?:г(?:рам(?:ів|и|а)?)?\s*)?(?:клітковини|клітковина)`
    ]);

    const recognized=[kcal,protein,fat,carb,sugar,salt,fiber].some(v=>v!==null);
    if(!recognized)return null;

    return {
      kcal:kcal??0,
      protein:protein??0,
      fat:fat??0,
      carb:carb??0,
      sugar:sugar??0,
      salt:salt??0,
      fiber:fiber??0
    };
  }

  function parseCalculatorLine(line){
    const clean=String(line).trim().replace(/\s+/g," ");if(!clean)return null;

    const nutrition=extractCalculatorNutrition(clean);
    if(nutrition){
      const nameMatch=clean.match(/^(.+?),\s*для\s+/i);
      const weightMatch=clean.match(/,\s*для\s*([+-]?(?:\d{1,3}(?:[ \u00A0\u202F]\d{3})+|\d+)(?:[.,]\d+)?)\s*(?:грам(?:ів|и|а)?|гр|г|мл)/i);
      return {
        id:createId("calc"),
        name:nameMatch?nameMatch[1].trim():clean,
        weight:weightMatch?calculatorNumber(weightMatch[1]):0,
        ...nutrition,
        text:clean,
        created_at:new Date().toISOString()
      };
    }

    // Preserve the existing free-text behavior.
    const km=clean.match(/^\+?\s*([+-]?(?:\d{1,3}(?:[ \u00A0\u202F]\d{3})+|\d+)(?:[.,]\d+)?)\s*(?:ккал|калор(?:і|и|ій|ія|ійність)?)\s*$/i);
    if(km)return{id:createId("calc"),name:clean,weight:0,kcal:calculatorNumber(km[1]),protein:0,fat:0,carb:0,sugar:0,salt:0,fiber:0,text:clean,created_at:new Date().toISOString()};

    return{id:createId("calc"),name:clean,weight:0,kcal:0,protein:0,fat:0,carb:0,sugar:0,salt:0,fiber:0,text:clean,created_at:new Date().toISOString()};
  }

  const CALCULATOR_NUMERIC_FIELDS=["weight","kcal","protein","fat","carb","sugar","salt","fiber"];
  function isValidCalculatorItem(item){
    if(!item||typeof item!=="object"||Array.isArray(item))return false;
    if(!String(item.text??item.name??"").trim())return false;
    for(const key of CALCULATOR_NUMERIC_FIELDS){
      const aliases=key==="protein"?["protein","proteins"]:key==="fat"?["fat","fats"]:key==="carb"?["carb","carbs"]:key==="sugar"?["sugar","sugars"]:key==="fiber"?["fiber","fibre"]:[key];
      const seen=[];
      for(const alias of aliases){
        if(item[alias]===undefined||item[alias]===null||item[alias]==="")continue;
        const value=Number(String(item[alias]).trim().replace(",","."));
        if(!Number.isFinite(value)||value<0)return false;
        seen.push(value);
      }
      if(seen.some(value=>value!==seen[0]))return false;
    }
    const parsed=extractCalculatorNutrition(String(item.text??item.name??""));
    if(parsed&&Object.values(parsed).some(value=>value<0||!Number.isFinite(value)))return false;
    return true;
  }

  function normalizeCalculatorItem(item){
    if(!item||typeof item!=="object")return item;
    const text=String(item.text||item.name||"").trim();
    const fromText=extractCalculatorNutrition(text);

    // For any line that contains labeled nutrition values, the visible text is the source of truth.
    // This also repairs old calculator rows that were saved with a wrong/zero fat value.
    if(fromText){
      return {
        ...item,
        ...fromText,
        text,
        id:item.id||createId("calc"),
        created_at:item.created_at||new Date().toISOString()
      };
    }

    return {
      ...item,
      kcal:calculatorNumber(item.kcal),
      protein:calculatorNumber(item.protein ?? item.proteins),
      fat:calculatorNumber(item.fat ?? item.fats),
      carb:calculatorNumber(item.carb ?? item.carbs),
      sugar:calculatorNumber(item.sugar ?? item.sugars),
      salt:calculatorNumber(item.salt),
      fiber:calculatorNumber(item.fiber ?? item.fibre)
    };
  }

  calcInput?.addEventListener("input",saveCalculatorDraft);
  calcAdd?.addEventListener("click",()=>{
    const text=calcInput.value.trim();if(!text){showButtonState(calcAdd,"Немає даних","error",1500);logAction("Додавання в калькулятор не виконано: поле порожнє.");return;}
    const items=text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).map(parseCalculatorLine).filter(Boolean);
    if(!items.every(isValidCalculatorItem)){
      showButtonState(calcAdd,"Некоректне КБЖВ","error",1800);
      alert("Від’ємні або некоректні значення КБЖВ не дозволені. Виправте текст перед додаванням.");
      return;
    }
    const normalizedItems=items.map(normalizeCalculatorItem);
    saveUndoSnapshot(`Додавання ${items.length} записів у калькулятор`);
    calculatorItems.push(...normalizedItems);if(!saveCalculatorLocal()){showButtonState(calcAdd,"Не збережено","error");return;}renderCalculatorLog();updateTotals();calcInput.value="";if(!persistUserChange("Очищення чернетки",()=>safeStorageRemove(CALCULATOR_DRAFT_KEY))){showButtonState(calcAdd,"Чернетку не очищено","error");return;}showButtonState(calcAdd,"Додано","success",1500); logAction(`У калькулятор додано записів: ${items.length}: ${items.map(item=>item.text||item.name||"запис").join(" | ")}.`,{calculator_items:items.map(item=>({name:item.name,weight:item.weight,text:item.text,kcal:item.kcal,protein:item.protein,fat:item.fat,carb:item.carb,sugar:item.sugar,salt:item.salt,fiber:item.fiber}))});
  });
  calcSection?.addEventListener("click",()=>{saveUndoSnapshot("Додавання розділу в калькулятор");calculatorItems.push({text:"/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/",kcal:0,protein:0,fat:0,carb:0,sugar:0,salt:0,fiber:0});if(!saveCalculatorLocal()){showButtonState(calcSection,"Не додано","error",1500);return;}renderCalculatorLog();showButtonState(calcSection,"Додано","success",1500);logAction("У калькулятор додано розділ.");});
  function quickPresetItem(metric,amount){
    const nutrition={kcal:0,protein:0,fat:0,carb:0,sugar:0,salt:0,fiber:0};
    nutrition[metric]=amount;
    const label=quickPresetLabel({metric,amount});
    return normalizeCalculatorItem({
      id:createId("calc"),
      name:label,
      text:label,
      weight:0,
      ...nutrition,
      created_at:new Date().toISOString()
    });
  }
  function addQuickPresetToCalculator(preset,button){
    const item=normalizeQuickPreset(preset);
    if(!item)return;
    saveUndoSnapshot(`Додавання ${quickPresetLabel(item)} у калькулятор`);
    calculatorItems.push(quickPresetItem(item.metric,item.amount));
    if(!saveCalculatorLocal()){showButtonState(button,"Не додано","error");return;}
    renderCalculatorLog();
    updateTotals();
    showButtonState(button,"Додано","success");
    logAction(`У калькулятор додано ${quickPresetLabel(item)}.`);
  }
  function renderCalculatorQuickPresets(){
    if(!calcQuickPresets)return;
    calcQuickPresets.innerHTML="";
    calculatorQuickPresets.forEach(preset=>{
      const button=document.createElement("button");
      button.type="button";
      button.className="calc-quick-preset-button";
      button.textContent=quickPresetLabel(preset);
      button.addEventListener("click",()=>addQuickPresetToCalculator(preset,button));
      calcQuickPresets.append(button);
    });
    calcQuickPresets.hidden=!calculatorQuickPresets.length;
  }
  function renderCalculatorQuickPresetList(){
    if(!calcQuickList)return;
    calcQuickList.innerHTML="";
    if(!calculatorQuickPresets.length){
      const empty=document.createElement("div");
      empty.className="calc-quick-empty";
      empty.textContent="Швидких КБЖВ ще немає.";
      calcQuickList.append(empty);
      return;
    }
    calculatorQuickPresets.forEach(preset=>{
      const row=document.createElement("div");
      row.className="calc-quick-row";
      const name=document.createElement("div");
      name.className="calc-quick-row-name";
      name.textContent=quickPresetLabel(preset);
      const remove=document.createElement("button");
      remove.type="button";
      remove.className="calc-quick-remove";
      remove.textContent="Видалити";
      remove.addEventListener("click",()=>{
        saveUndoSnapshot("Видалення швидкого КБЖВ");
        calculatorQuickPresets=calculatorQuickPresets.filter(item=>item.id!==preset.id);
        if(!saveCalculatorQuickPresets()){showButtonState(remove,"Не видалено","error");return;}
        renderCalculatorQuickPresetList();
        showButtonState(remove,"Видалено","success");
        logAction(`Швидке КБЖВ «${quickPresetLabel(preset)}» видалено.`);
      });
      row.append(name,remove);
      calcQuickList.append(row);
    });
  }
  function openCalculatorQuickModal(){
    renderCalculatorQuickPresetList();
    if(calcQuickValue)calcQuickValue.value="";
    calcQuickModal?.classList.add("active");
    document.body.classList.add("edit-modal-open");
    setTimeout(()=>calcQuickValue?.focus(),50);
    logAction("Відкрито налаштування швидких КБЖВ.");
  }
  function closeCalculatorQuickModal(){
    calcQuickModal?.classList.remove("active");
    document.body.classList.remove("edit-modal-open");
  }
  calcQuickManage?.addEventListener("click",openCalculatorQuickModal);
  calcQuickClose?.addEventListener("click",()=>{
    showButtonState(calcQuickClose,"Закрито","error");
    setTimeout(closeCalculatorQuickModal,260);
  });
  calcQuickModal?.addEventListener("click",event=>{if(event.target===calcQuickModal)closeCalculatorQuickModal();});
  calcQuickAdd?.addEventListener("click",()=>{
    const metric=String(calcQuickMetric?.value||"");
    const amount=calculatorNumber(calcQuickValue?.value);
    if(!QUICK_METRICS.has(metric)||!(amount>0)){
      showButtonState(calcQuickAdd,"Вкажіть значення","error");
      calcQuickValue?.focus();
      return;
    }
    const duplicate=calculatorQuickPresets.some(item=>item.metric===metric&&Math.abs(item.amount-amount)<0.0005);
    if(duplicate){
      showButtonState(calcQuickAdd,"Вже є","error");
      return;
    }
    saveUndoSnapshot("Додавання швидкого КБЖВ");
    const preset={id:createId("quick"),metric,amount:Math.round((amount+Number.EPSILON)*1000)/1000};
    calculatorQuickPresets.push(preset);
    if(!saveCalculatorQuickPresets()){showButtonState(calcQuickAdd,"Не додано","error");return;}
    renderCalculatorQuickPresetList();
    if(calcQuickValue)calcQuickValue.value="";
    showButtonState(calcQuickAdd,"Додано","success");
    logAction(`Створено швидке КБЖВ «${quickPresetLabel(preset)}».`);
  });
  calcQuickValue?.addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();calcQuickAdd?.click();}});
  calcClearText?.addEventListener("click",()=>{if(!calcInput.value.trim()){showButtonState(calcClearText,"Немає даних","error",1500);logAction("Очищення тексту не виконано: поле вже порожнє.");return;}saveUndoSnapshot("Очищення тексту калькулятора");calcInput.value="";safeStorageRemove(CALCULATOR_DRAFT_KEY);markLocalDataChanged();showButtonState(calcClearText,"Очищено","success",1500);logAction("Поле введення калькулятора очищено.");});
  calcClearBlocks?.addEventListener("click",()=>{if(!calculatorItems.length){showButtonState(calcClearBlocks,"Немає даних","error",1500);logAction("Очищення історії калькулятора не виконано: історія порожня.");return;}if(!confirm("Очистити всю історію калькулятора?")){showButtonState(calcClearBlocks,"Не очищено","error",1500);logAction("Очищення історії калькулятора скасовано.");return;}saveUndoSnapshot("Очищення історії калькулятора");calculatorItems=[];if(!saveCalculatorLocal()){showButtonState(calcClearBlocks,"Не очищено","error",1500);return;}renderCalculatorLog();updateTotals();showButtonState(calcClearBlocks,"Очищено","success",1500);logAction("Історію калькулятора очищено.");});
  function updateTotals(){
    let repaired=false;
    const t=calculatorItems.reduce((a,raw,index)=>{
      const i=normalizeCalculatorItem(raw);
      if(i&&raw&&JSON.stringify(i)!==JSON.stringify(raw)){calculatorItems[index]=i;repaired=true;}
      for(const k of ["kcal","protein","fat","carb","sugar","salt","fiber"])a[k]+=calculatorNumber(i?.[k]);
      return a;
    },{kcal:0,protein:0,fat:0,carb:0,sugar:0,salt:0,fiber:0});
    if(repaired)saveCalculatorLocal();
    kcalElement.textContent=formatNumber(t.kcal);proteinElement.textContent=formatNumber(t.protein);fatElement.textContent=formatNumber(t.fat);carbElement.textContent=formatNumber(t.carb);sugarElement.textContent=formatNumber(t.sugar);saltElement.textContent=formatNumber(t.salt);fiberElement.textContent=formatNumber(t.fiber);updateDailyGoalRemaining();
  }
  function renderCalculatorLog(){
    calcLog.innerHTML="";
    calcLog.classList.toggle("calc-history-reorder-mode",calculatorReorderMode);
    if(!calculatorItems.length){calcLog.innerHTML='<div style="padding:10px 0;">Історія порожня.</div>';return;}
    calculatorItems.forEach((item,index)=>{
      const row=document.createElement("div");row.className="log-item calc-log-item";row.dataset.index=String(index);
      const text=document.createElement("span");text.className="calc-log-text";text.textContent=item.text||item.name||"";
      const remove=document.createElement("button");remove.className="remove";remove.textContent="Видалити";remove.onclick=()=>{const removed=calculatorItems[index];saveUndoSnapshot(`Видалення запису з калькулятора`);calculatorItems.splice(index,1);if(!saveCalculatorLocal()){showButtonState(remove,"Не видалено","error");return;}renderCalculatorLog();updateTotals();logAction(`З калькулятора видалено: ${removed?.text||removed?.name||"запис"}.`);};
      const move=document.createElement("div");move.className="calc-history-move";
      const up=document.createElement("button");up.className="calc-move-button";up.textContent="↑";up.title="Перемістити вище";up.disabled=index===0;
      const down=document.createElement("button");down.className="calc-move-button";down.textContent="↓";down.title="Перемістити нижче";down.disabled=index===calculatorItems.length-1;
      up.onclick=()=>{if(index<=0)return;if(!calculatorReorderChanged)saveUndoSnapshot("Зміна розташування історії калькулятора");[calculatorItems[index-1],calculatorItems[index]]=[calculatorItems[index],calculatorItems[index-1]];calculatorReorderChanged=true;renderCalculatorLog();};
      down.onclick=()=>{if(index>=calculatorItems.length-1)return;if(!calculatorReorderChanged)saveUndoSnapshot("Зміна розташування історії калькулятора");[calculatorItems[index],calculatorItems[index+1]]=[calculatorItems[index+1],calculatorItems[index]];calculatorReorderChanged=true;renderCalculatorLog();};
      move.append(up,down);
      const actions=document.createElement("div");actions.className="calc-log-actions";actions.append(remove,move);
      row.append(text,actions);calcLog.append(row);
    });
  }
  reorderCalculatorHistory?.addEventListener("click",()=>{
    if(!calculatorItems.length){showButtonState(reorderCalculatorHistory,"Немає історії","error",1600);logAction("Зміну розташування історії не розпочато: історія порожня.");return;}
    if(!calculatorReorderMode){
      calculatorReorderMode=true;calculatorReorderChanged=false;
      setButtonStatusPermanent(reorderCalculatorHistory,"Готово","info");
      renderCalculatorLog();
      logAction("Розпочато зміну розташування історії калькулятора.");
      return;
    }
    calculatorReorderMode=false;
    if(calculatorReorderChanged){
      if(!saveCalculatorLocal()){calculatorReorderChanged=false;renderCalculatorLog();showButtonState(reorderCalculatorHistory,"Не збережено","error",1800);return;}
      updateTotals();renderCalculatorLog();
      showButtonState(reorderCalculatorHistory,"Розташування змінено","success",1800);
      logAction("Розташування історії калькулятора змінено.");
    }else{
      renderCalculatorLog();
      showButtonState(reorderCalculatorHistory,"Розташування не змінено","error",1800);
      logAction("Зміну розташування історії калькулятора завершено без змін.");
    }
  });
  function getTotalSummary(){return `Денний підсумок: ${kcalElement.textContent} калорій / ${proteinElement.textContent} білка / ${fatElement.textContent} жирів / ${carbElement.textContent} вуглеводів / ${sugarElement.textContent} цукрів / ${saltElement.textContent} солі / ${fiberElement.textContent} клітковини`;}
  copyTotal?.addEventListener("click",async()=>{if(await copyText(getTotalSummary())){showButtonState(copyTotal,"Скопійовано","success",1500);logAction("Денний підсумок скопійовано.");}else showButtonState(copyTotal,"Не скопійовано","error",1500);});
  function getCurrentDate(){const n=new Date();return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`;}
  function snapshotCalculatorComposition(){
    return calculatorItems.map(item=>({
      text:String(item?.text||item?.name||"").trim(),
      name:String(item?.name||"").trim(),
      weight:number(item?.weight)
    })).filter(item=>item.text||item.name);
  }
  saveArchive?.addEventListener("click",()=>{if(!calculatorItems.length){showButtonState(saveArchive,"Немає даних","error",1500);logAction("Збереження в архів не виконано: калькулятор порожній.");return alert("Немає даних для збереження в архів.");}saveUndoSnapshot("Збереження денного підсумку в архів");archiveItems.unshift({id:createId("archive"),date:getCurrentDate(),text:getTotalSummary(),comment:"",kcal:number(kcalElement.textContent),protein:number(proteinElement.textContent),fat:number(fatElement.textContent),carb:number(carbElement.textContent),sugar:number(sugarElement.textContent),salt:number(saltElement.textContent),fiber:number(fiberElement.textContent),composition:snapshotCalculatorComposition(),created_at:new Date().toISOString()});if(!saveArchiveLocal()){showButtonState(saveArchive,"Не збережено","error");return;}renderArchive();renderStatistics();showButtonState(saveArchive,"Збережено","success",1500);logAction(`Денний підсумок збережено в архів разом зі складом (записів: ${calculatorItems.length}): ${snapshotCalculatorComposition().map(item=>item.text||item.name).join(" | ")}.`,{archive_composition:snapshotCalculatorComposition(),total:getTotalSummary()});});
  function formatArchiveDate(v){const m=String(v||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[3]}.${m[2]}.${m[1]}`:v;}
  function normalizeArchiveSearch(value){return String(value??"").normalize("NFKC").toLocaleLowerCase("uk-UA").trim();}
  function archiveItemSearchText(item){
    const composition=(Array.isArray(item?.composition)?item.composition:[]).map(archiveCompositionLine).join(" ");
    return normalizeArchiveSearch([
      item?.date,formatArchiveDate(item?.date||""),item?.text,item?.comment,composition
    ].filter(Boolean).join(" "));
  }
  function filteredArchiveItems(){
    const query=normalizeArchiveSearch(archiveSearch?.value||"");
    if(!query)return archiveItems;
    return archiveItems.filter(item=>archiveItemSearchText(item).includes(query));
  }
  function renderArchive(){
    updateSiteDataCounts();
    if(!archiveLog)return;
    archiveLog.innerHTML="";
    const query=normalizeArchiveSearch(archiveSearch?.value||"");
    const items=filteredArchiveItems();
    if(archiveSearchStatus){
      archiveSearchStatus.textContent=query
        ? `Знайдено: ${items.length} із ${archiveItems.length}. Пошук виконується за точним збігом введених символів.`
        : `Показано всі записи: ${archiveItems.length}.`;
    }
    if(archiveSearchClear)archiveSearchClear.hidden=!query;
    if(!archiveItems.length){archiveLog.innerHTML='<div style="padding:10px 0;">Архів порожній.</div>';return;}
    if(!items.length){archiveLog.innerHTML='<div style="padding:10px 0;">За цим запитом записів не знайдено.</div>';return;}
    items.forEach(item=>{
      const row=document.createElement("div");row.className="log-item archive-item";
      const content=document.createElement("div");content.className="archive-content";
      const date=document.createElement("div");date.style.fontWeight="600";date.style.color="var(--text-main)";date.textContent=formatArchiveDate(item.date);
      const text=document.createElement("div");text.textContent=item.text;content.append(date,text);
      const commentText=String(item.comment||"").trim();
      if(commentText){
        const comment=document.createElement("div");
        comment.className="archive-comment-preview";
        const label=document.createElement("strong");
        label.textContent="Коментар:";
        const value=document.createElement("span");
        value.textContent=commentText;
        comment.append(label,value);
        content.append(comment);
      }
      const actions=document.createElement("div");actions.className="archive-actions";
      const composition=document.createElement("button");composition.className="archive-composition-button";composition.textContent="Переглянути склад";if(!Array.isArray(item.composition)||!item.composition.length){composition.classList.add("archive-action-unavailable");composition.title="Склад для цього запису не був збережений";}
      const ed=document.createElement("button");ed.className="edit-date";ed.textContent="Змінити дату";
      const et=document.createElement("button");et.className="edit-text";et.textContent="Змінити текст";et.dataset.archiveId=String(item.id);
      const commentButton=document.createElement("button");commentButton.className="archive-comment-button";commentButton.textContent="Додати коментар";commentButton.dataset.archiveId=String(item.id);
      const rm=document.createElement("button");rm.className="remove";rm.textContent="Видалити";
      composition.onclick=()=>openArchiveComposition(item,composition);
      ed.onclick=()=>editArchiveDate(item,date,ed);
      et.onclick=()=>openArchiveTextModal(item,et);
      commentButton.onclick=()=>openArchiveCommentModal(item,commentButton);
      rm.onclick=()=>{if(confirm("Видалити цей запис з архіву?")){saveUndoSnapshot("Видалення запису з архіву");archiveItems=archiveItems.filter(a=>a.id!==item.id);if(!saveArchiveLocal()){showButtonState(rm,"Не видалено","error");return;}renderArchive();renderStatistics();logAction("Запис видалено з архіву.");}else{showButtonState(rm,"Видалити","error",900);logAction("Видалення запису з архіву скасовано.");}};
      actions.append(ed,et,composition,commentButton,rm);row.append(content,actions);archiveLog.append(row);
    });
  }

  function archiveCompositionLine(entry){
    if(typeof entry==="string")return entry;
    if(!entry||typeof entry!=="object")return "";
    const text=String(entry.text||"").trim();
    const name=String(entry.name||"").trim();
    const weight=number(entry.weight);
    if(weight>0&&name)return `${name} — ${formatNumber(weight)} г`;
    return text||name;
  }
  function openArchiveComposition(item,button){
    if(!archiveCompositionModal||!archiveCompositionList)return;
    archiveCompositionSourceButton=button||null;
    const composition=Array.isArray(item?.composition)?item.composition:[];
    archiveCompositionList.innerHTML="";
    if(archiveCompositionDate)archiveCompositionDate.textContent=formatArchiveDate(item?.date||"");

    if(!composition.length){
      const empty=document.createElement("div");
      empty.className="archive-composition-empty";
      empty.textContent="Склад для цього запису не був збережений.";
      archiveCompositionList.append(empty);
      clearButtonStatus(button);
      button.textContent=button.dataset.originalText||"Переглянути склад";
      logAction(`Перегляд складу архіву за ${formatArchiveDate(item?.date||"")} — даних немає.`);
    }else{
      composition.forEach(entry=>{
        const line=archiveCompositionLine(entry);
        if(!line)return;
        if(/^\/-\/-/.test(line)){
          const divider=document.createElement("div");
          divider.className="archive-composition-divider";
          archiveCompositionList.append(divider);
          return;
        }
        const row=document.createElement("div");
        row.className="archive-composition-entry";
        row.textContent=line;
        archiveCompositionList.append(row);
      });
      clearButtonStatus(button);
      button.textContent=button.dataset.originalText||"Переглянути склад";
      logAction(`Відкрито склад денного підсумку за ${formatArchiveDate(item?.date||"")} (${composition.length} записів).`);
    }

    archiveCompositionModal.classList.add("active");
    document.body.classList.add("edit-modal-open");
  }
  function closeArchiveComposition(logClose=true,acknowledged=false){
    const sourceButton=archiveCompositionSourceButton;
    archiveCompositionSourceButton=null;
    archiveCompositionModal?.classList.remove("active");
    document.body.classList.remove("edit-modal-open");

    if(sourceButton){
      if(acknowledged){
        requestAnimationFrame(()=>showButtonState(sourceButton,"Переглянуто","success"));
      }else{
        requestAnimationFrame(()=>showButtonState(sourceButton,"Закрито","error",900));
      }
    }

    if(logClose)logAction(acknowledged?"Перегляд складу денного підсумку підтверджено.":"Перегляд складу денного підсумку закрито без підтвердження.");
  }
  archiveCompositionClose?.addEventListener("click",()=>{
    showButtonState(archiveCompositionClose,"Зрозуміло","success");
    setTimeout(()=>closeArchiveComposition(true,true),360);
  });
  archiveCompositionModal?.addEventListener("click",e=>{
    if(e.target===archiveCompositionModal)closeArchiveComposition(true,false);
  });

  function editArchiveDate(item,dateElement,actionButton){
    if(dateElement.querySelector("input"))return;
    logAction(`Відкрито зміну дати запису архіву за ${formatArchiveDate(item.date||"")}.`);
    const original=item.date||"";
    const input=document.createElement("input");
    input.type="date";
    input.className="archive-date-input";
    input.value=original||getCurrentDate();
    dateElement.textContent="";
    dateElement.append(input);
    input.focus();

    let done=false;
    const finish=()=>{
      if(done)return;
      done=true;
      if(input.value&&input.value!==original){
        saveUndoSnapshot("Зміна дати запису архіву");
        item.date=input.value;
        if(!saveArchiveLocal()){dateElement.textContent=formatArchiveDate(original);showButtonState(actionButton,"Не збережено","error",1200);return;}
        renderStatistics();
        dateElement.textContent=formatArchiveDate(item.date);
        showButtonState(actionButton,"Змінено","success",900);
        logAction(`Дата запису архіву змінена з ${original} на ${input.value}.`);
      }else{
        dateElement.textContent=formatArchiveDate(original);
        showButtonState(actionButton,"Без змін","error",900);
        logAction(input.value?"Зміну дати архіву завершено без змін.":"Зміну дати архіву скинуто/скасовано без збереження.");
      }
    };
    input.addEventListener("change",finish,{once:true});
    input.addEventListener("blur",finish,{once:true});
  }
  function openArchiveTextModal(item,actionButton){archiveEditingId=item.id;archiveOriginalText=item.text||"";archiveEditingButton=actionButton||null;archiveTextInput.value=item.text||"";archiveTextModal.classList.add("active");document.body.classList.add("edit-modal-open");logAction(`Відкрито редагування тексту запису архіву за ${formatArchiveDate(item.date||"")}.`);setTimeout(()=>archiveTextInput.focus(),50);}
  function closeArchiveTextModal(){archiveEditingId=null;archiveOriginalText=null;archiveEditingButton=null;archiveTextModal.classList.remove("active");document.body.classList.remove("edit-modal-open");}
  archiveTextCancel?.addEventListener("click",()=>{const outer=archiveEditingButton;showButtonState(archiveTextCancel,"Скасовано","error",500);closeArchiveTextModal();showButtonState(outer,"Не змінено","error",900);logAction("Редагування тексту архіву скасовано.");});
  archiveTextModal?.addEventListener("click",e=>{if(e.target===archiveTextModal){const outer=archiveEditingButton;closeArchiveTextModal();showButtonState(outer,"Не змінено","error",900);logAction("Редагування тексту архіву закрито без збереження.");}});
  archiveTextSave?.addEventListener("click",()=>{const item=archiveItems.find(a=>a.id===archiveEditingId);const outer=archiveEditingButton;if(!item)return closeArchiveTextModal();const text=archiveTextInput.value.trim();if(!text)return archiveTextInput.focus();if(text!==archiveOriginalText){saveUndoSnapshot("Зміна тексту запису архіву");item.text=text;if(!saveArchiveLocal()){showButtonState(archiveTextSave,"Не збережено","error");return;}showButtonState(archiveTextSave,"Збережено","success");logAction("Текст запису архіву змінено.");closeArchiveTextModal();renderArchive();const refreshedOuter=[...archiveLog.querySelectorAll(".edit-text")].find(button=>button.dataset.archiveId===String(item.id));showButtonState(refreshedOuter,"Змінено","success");}else{showButtonState(archiveTextSave,"Не змінено","error");showButtonState(outer,"Не змінено","error");logAction("Текст запису архіву залишено без змін.");closeArchiveTextModal();}});

  function updateArchiveCommentLimit(){
    if(!archiveCommentInput||!archiveCommentLimit)return 0;
    const over=Math.max(0,Array.from(archiveCommentInput.value).length-500);
    archiveCommentLimit.textContent=over?`Перевищено ліміт на ${over} символів.`:"";
    archiveCommentLimit.classList.toggle("active",over>0);
    return over;
  }
  function openArchiveCommentModal(item,actionButton){
    archiveCommentEditingId=item.id;
    archiveCommentOriginal=String(item.comment||"");
    archiveCommentEditingButton=actionButton||null;
    archiveCommentInput.value=archiveCommentOriginal;
    updateArchiveCommentLimit();
    archiveCommentModal?.classList.add("active");
    document.body.classList.add("edit-modal-open");
    logAction(`Відкрито коментар до запису архіву за ${formatArchiveDate(item.date||"")}.`);
    setTimeout(()=>archiveCommentInput?.focus(),50);
  }
  function closeArchiveCommentModal(){
    archiveCommentEditingId=null;
    archiveCommentOriginal="";
    archiveCommentEditingButton=null;
    archiveCommentModal?.classList.remove("active");
    document.body.classList.remove("edit-modal-open");
    if(archiveCommentLimit){archiveCommentLimit.textContent="";archiveCommentLimit.classList.remove("active");}
  }
  archiveCommentInput?.addEventListener("input",updateArchiveCommentLimit);
  archiveCommentCancel?.addEventListener("click",()=>{
    const outer=archiveCommentEditingButton;
    showButtonState(archiveCommentCancel,"Скасовано","error");
    closeArchiveCommentModal();
    showButtonState(outer,"Не змінено","error");
    logAction("Редагування коментаря архіву скасовано.");
  });
  archiveCommentModal?.addEventListener("click",event=>{
    if(event.target===archiveCommentModal){
      const outer=archiveCommentEditingButton;
      closeArchiveCommentModal();
      showButtonState(outer,"Не змінено","error");
      logAction("Коментар архіву закрито без збереження.");
    }
  });
  archiveCommentSave?.addEventListener("click",()=>{
    const item=archiveItems.find(entry=>entry.id===archiveCommentEditingId);
    const outer=archiveCommentEditingButton;
    if(!item)return closeArchiveCommentModal();
    if(updateArchiveCommentLimit()>0){
      showButtonState(archiveCommentSave,"Забагато символів","error");
      archiveCommentInput?.focus();
      return;
    }
    const comment=String(archiveCommentInput?.value||"").trim();
    if(comment!==archiveCommentOriginal){
      saveUndoSnapshot("Зміна коментаря запису архіву");
      item.comment=comment;
      if(!saveArchiveLocal()){showButtonState(archiveCommentSave,"Не збережено","error");return;}
      showButtonState(archiveCommentSave,"Збережено","success");
      logAction(comment?"Коментар до запису архіву збережено.":"Коментар до запису архіву очищено.");
      closeArchiveCommentModal();
      renderArchive();
      const refreshed=[...archiveLog.querySelectorAll(".archive-comment-button")].find(button=>button.dataset.archiveId===String(item.id));
      showButtonState(refreshed,"Збережено","success");
    }else{
      showButtonState(archiveCommentSave,"Не змінено","error");
      showButtonState(outer,"Не змінено","error");
      logAction("Коментар архіву залишено без змін.");
      closeArchiveCommentModal();
    }
  });

  function parseArchiveMetrics(item){
    const keys=["kcal","protein","fat","carb","sugar","salt","fiber"];
    const result=Object.fromEntries(keys.map(key=>[key,number(item?.[key])]));
    const t=String(item?.text||"");
    const patterns={kcal:/([\d.,]+)\s*(?:калорій|ккал)/i,protein:/([\d.,]+)\s*білка/i,fat:/([\d.,]+)\s*жирів/i,carb:/([\d.,]+)\s*вуглеводів/i,sugar:/([\d.,]+)\s*цукрів/i,salt:/([\d.,]+)\s*солі/i,fiber:/([\d.,]+)\s*клітковини/i};
    for(const [key,re] of Object.entries(patterns)){
      const raw=item?.[key];
      if(raw!==undefined&&raw!==null&&String(raw).trim()!=="")continue;
      const match=t.match(re);
      if(match)result[key]=number(match[1].replace(",","."));
    }
    return result;
  }
  function syncStatsToToday(render=true){
    if(!statsToToday||!statsTo)return;
    statsToToday.checked=statsToTodayEnabled;
    statsTo.disabled=statsToTodayEnabled;
    if(statsToTodayEnabled)statsTo.value=getCurrentDate();
    if(render)renderStatistics();
  }
  function setupStatisticsDates(){
    const dates=archiveItems.map(i=>i.date).filter(Boolean).sort();
    if(dates.length&&!statsFrom.value)statsFrom.value=dates[0];
    if(statsToTodayEnabled){
      if(statsTo)statsTo.value=getCurrentDate();
    }else if(dates.length&&!statsTo.value){
      statsTo.value=dates[dates.length-1];
    }
  }
  function statsMetricLabel(){
    return ({kcal:"Калорії",protein:"Білки",fat:"Жири",carb:"Вуглеводи",sugar:"Цукри",salt:"Сіль",fiber:"Клітковина"})[statsMetric]||statsMetric;
  }
  function formatStatsDate(iso){const [y,m,d]=String(iso).split("-");return `${d}.${m}.${y}`;}
  function latestArchiveItemsByDate(){
    const map=new Map();
    archiveItems.forEach((item,index)=>{
      const date=String(item?.date||"");
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return;
      const stamp=Number.isFinite(Date.parse(item?.created_at||""))?Date.parse(item.created_at):-index;
      const existing=map.get(date);
      if(!existing||stamp>existing.stamp)map.set(date,{item,stamp});
    });
    return [...map.values()].map(entry=>entry.item).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  }
  function localDateKey(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;}
  function renderArchiveAverages(){
    const entries=latestArchiveItemsByDate();
    const today=new Date();today.setHours(0,0,0,0);
    const configs=[[7,avgKcal7,avgKcal7Note],[14,avgKcal14,avgKcal14Note],[30,avgKcal30,avgKcal30Note]];
    configs.forEach(([days,valueEl,noteEl])=>{
      if(!valueEl||!noteEl)return;
      const start=new Date(today);start.setDate(start.getDate()-(days-1));
      const from=localDateKey(start),to=localDateKey(today);
      const matching=entries.filter(item=>item.date>=from&&item.date<=to);
      if(!matching.length){valueEl.textContent="—";noteEl.textContent=`Записано 0/${days} днів`;return;}
      const average=matching.reduce((sum,item)=>sum+parseArchiveMetrics(item).kcal,0)/matching.length;
      valueEl.textContent=`${formatNumber(average)} ккал`;
      noteEl.textContent=`Записано ${matching.length}/${days} днів`;
    });
  }
  function renderMonthlyArchiveSummary(){
    if(!statsMonthSummary)return;
    const now=new Date(),year=now.getFullYear(),month=now.getMonth();
    const prefix=`${year}-${String(month+1).padStart(2,"0")}-`;
    const recordedDays=new Set(archiveItems.map(i=>String(i.date||"")).filter(d=>d.startsWith(prefix))).size;
    const daysInMonth=new Date(year,month+1,0).getDate();
    const monthLabel=new Intl.DateTimeFormat("uk-UA",{month:"long"}).format(now).toLowerCase();
    statsMonthSummary.textContent=`${year} рік, ${monthLabel}: записано ${recordedDays} ${dayCountWord(recordedDays)} з ${daysInMonth}.`;
  }
  function renderStatistics(){
    renderMonthlyArchiveSummary();
    renderArchiveAverages();
    if(!statsChart)return;
    const archivePage=document.getElementById("archive");
    if(!archivePage?.classList.contains("active"))return;
    setupStatisticsDates();
    const from=statsFrom.value||"0000-01-01",to=statsTo.value||"9999-12-31";
    const points=latestArchiveItemsByDate().filter(i=>i.date>=from&&i.date<=to).map(i=>({date:i.date,value:parseArchiveMetrics(i)[statsMetric]})).sort((a,b)=>a.date.localeCompare(b.date));
    const ctx=statsChart.getContext("2d"),rect=statsChart.getBoundingClientRect(),dpr=window.devicePixelRatio||1,w=Math.max(300,rect.width),h=Math.max(260,rect.height);
    statsChart.width=w*dpr;statsChart.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    statsRenderedPoints=[];statsChartGeometry=null;if(statsTooltip)statsTooltip.classList.remove("active");
    if(points.length<3){statsEmpty.style.display="flex";return;}statsEmpty.style.display="none";
    const vals=points.map(p=>p.value),rawMin=Math.min(...vals),rawMax=Math.max(...vals),rawRange=rawMax-rawMin||Math.max(Math.abs(rawMax)*.1,1),margin=rawRange*.12;
    const min=Math.max(0,rawMin-margin),max=rawMax+margin,range=max-min||1;
    const pad={l:58,r:18,t:18,b:48},cw=w-pad.l-pad.r,ch=h-pad.t-pad.b;
    const css=getComputedStyle(document.documentElement),primary=css.getPropertyValue("--primary-color").trim(),secondary=css.getPropertyValue("--text-secondary").trim(),gridColor=css.getPropertyValue("--bg-card").trim(),bodyStyle=getComputedStyle(document.body);
    ctx.font=`11px ${bodyStyle.fontFamily}`;ctx.lineWidth=1;ctx.strokeStyle=gridColor;ctx.fillStyle=secondary;
    const yTicks=6;
    for(let i=0;i<=yTicks;i++){const y=pad.t+ch*i/yTicks;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();ctx.textAlign="right";ctx.fillText(formatNumber(max-range*i/yTicks),pad.l-7,y+4);}
    const coords=points.map((p,i)=>({x:pad.l+(points.length===1?cw/2:cw*i/(points.length-1)),y:pad.t+ch*(max-p.value)/range,...p}));
    const xStep=Math.max(1,Math.ceil(points.length/(w<520?4:7)));
    coords.forEach((p,i)=>{if(i%xStep===0||i===coords.length-1){ctx.strokeStyle=gridColor;ctx.beginPath();ctx.moveTo(p.x,pad.t);ctx.lineTo(p.x,h-pad.b);ctx.stroke();ctx.fillStyle=secondary;ctx.textAlign="center";ctx.fillText(p.date.slice(8,10)+"."+p.date.slice(5,7),p.x,h-18);}});
    ctx.strokeStyle=primary;ctx.lineWidth=2;ctx.beginPath();coords.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
    ctx.fillStyle="#ef4444";coords.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,4.5,0,Math.PI*2);ctx.fill();});
    statsRenderedPoints=coords;statsChartGeometry={w,h,pad};
  }
  function inspectStatisticsPoint(clientX,clientY){
    if(!statsRenderedPoints.length||!statsTooltip)return;
    const rect=statsChart.getBoundingClientRect(),x=clientX-rect.left,y=clientY-rect.top;
    let nearest=statsRenderedPoints[0],dist=Infinity;
    statsRenderedPoints.forEach(p=>{const d=Math.hypot(p.x-x,p.y-y);if(d<dist){dist=d;nearest=p;}});
    const ctx=statsChart.getContext("2d"),g=statsChartGeometry;if(!g)return;
    renderStatistics();
    ctx.save();ctx.setLineDash([4,4]);ctx.strokeStyle="rgba(220,221,222,.65)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(nearest.x,g.pad.t);ctx.lineTo(nearest.x,g.h-g.pad.b);ctx.moveTo(g.pad.l,nearest.y);ctx.lineTo(g.w-g.pad.r,nearest.y);ctx.stroke();ctx.restore();
    ctx.fillStyle="#ef4444";ctx.beginPath();ctx.arc(nearest.x,nearest.y,6.5,0,Math.PI*2);ctx.fill();
    statsTooltip.innerHTML=`<strong>${formatNumber(nearest.value)} ${statsMetric==="kcal"?"калорій":"г"}</strong><span>${formatStatsDate(nearest.date)} · ${statsMetricLabel()}</span>`;
    const wrap=statsChart.parentElement,tw=statsTooltip.offsetWidth||160,th=statsTooltip.offsetHeight||54;
    statsTooltip.style.left=`${Math.max(8,Math.min(wrap.clientWidth-tw-8,nearest.x+14))}px`;
    statsTooltip.style.top=`${Math.max(8,Math.min(wrap.clientHeight-th-8,nearest.y-th-10))}px`;statsTooltip.classList.add("active");
  }
  statsChart?.addEventListener("mousemove",e=>inspectStatisticsPoint(e.clientX,e.clientY));
  statsChart?.addEventListener("mouseleave",()=>{statsTooltip?.classList.remove("active");renderStatistics();});
  statsChart?.addEventListener("click",e=>inspectStatisticsPoint(e.clientX,e.clientY));
  statsChart?.addEventListener("touchstart",e=>{const t=e.touches[0];if(t)inspectStatisticsPoint(t.clientX,t.clientY);},{passive:true});
  statsMetricButtons.forEach(button=>button.addEventListener("click",()=>{statsMetric=button.dataset.metric;statsMetricButtons.forEach(b=>b.classList.toggle("active",b===button));renderStatistics();showButtonState(button,button.dataset.originalText||button.textContent,"success",800);logAction(`Статистику перемкнено на показник «${button.dataset.originalText||button.textContent}».`);}));
  archiveSearch?.addEventListener("input",renderArchive);
  archiveSearchClear?.addEventListener("click",()=>{if(archiveSearch)archiveSearch.value="";renderArchive();archiveSearch?.focus();});
  siteDataToggle?.addEventListener("click",()=>{
    const next=!siteDataVisible;
    if(!persistUserChange("Видимість поточних даних",()=>safeStorageSet(SITE_DATA_VISIBLE_KEY,next?"1":"0",{critical:true}))){
      showButtonState(siteDataToggle,"Не збережено","error",1500);return;
    }
    siteDataVisible=next;
    renderSiteDataVisibility();
    showButtonState(siteDataToggle,siteDataVisible?"Показано":"Сховано",siteDataVisible?"success":"error",900);
    logAction(siteDataVisible?"Поточні дані сайту показано.":"Поточні дані сайту приховано.");
  });

  function rememberValidStatsRange(){lastValidStatsFrom=statsFrom?.value||"";lastValidStatsTo=statsTo?.value||"";}
  [statsFrom,statsTo].forEach(input=>input?.addEventListener("focus",rememberValidStatsRange));
  [statsFrom,statsTo].forEach(input=>input?.addEventListener("change",()=>{
    if(statsFrom.value&&statsTo.value){
      const fromDate=new Date(`${statsFrom.value}T00:00:00`),toDate=new Date(`${statsTo.value}T00:00:00`);
      const days=Math.round((toDate-fromDate)/86400000);
      if(days<0){
        statsFrom.value=lastValidStatsFrom;statsTo.value=lastValidStatsTo;
        showButtonState(statsMetricButtons[0],"Некоректний період","error",1200);
        logAction("Період статистики не змінено: початкова дата пізніше кінцевої.");return;
      }
      if(days<2){
        statsFrom.value=lastValidStatsFrom;statsTo.value=lastValidStatsTo;
        showButtonState(statsMetricButtons[0],"Мінімум 3 дні","error",1200);
        logAction("Період статистики не змінено: мінімальний період 3 дні.");return;
      }
    }
    rememberValidStatsRange();renderStatistics();logAction(`Період статистики змінено: ${statsFrom.value||"початок"} — ${statsTo.value||"кінець"}.`);
  }));
  statsToToday?.addEventListener("change",()=>{
    const next=!!statsToToday.checked;
    if(!persistUserChange("Дата статистики",()=>safeStorageSet(STATS_TO_TODAY_KEY,next?"1":"0",{critical:true}))){
      statsToToday.checked=statsToTodayEnabled;return;
    }
    statsToTodayEnabled=next;syncStatsToToday(true);
    logAction(statsToTodayEnabled?"Статистику встановлено до поточного дня.":"Автоматичну дату «До поточного дня» вимкнено.");
  });
  window.addEventListener("resize",()=>{if(document.getElementById("archive")?.classList.contains("active"))renderStatistics();});


  showRegister?.addEventListener("click",()=>switchAuthMode("register"));
  showLogin?.addEventListener("click",()=>switchAuthMode("login"));
  showForgotPassword?.addEventListener("click",async()=>{
    const username=String(loginUsername?.value||"").trim();
    if(!username){setAuthMessage("Спочатку введіть логін акаунта, доступ до якого потрібно відновити.","error");loginUsername?.focus();return;}
    if(recoveryRequestUsername)recoveryRequestUsername.textContent=username;
    switchAuthMode("forgot");
    await loadPublicRecoveryContact();
  });
  forgotPasswordBack?.addEventListener("click",()=>switchAuthMode("login"));
  registerPassword?.addEventListener("input",renderPasswordStrength);

  loginForm?.addEventListener("submit",async event=>{
    event.preventDefault();const username=String(loginUsername?.value||"").trim(),password=String(loginPassword?.value||""),rememberMe=!!loginRemember?.checked;
    if(!username||!password){setAuthMessage("Введіть логін і пароль.","error");return;}
    loginSubmit.disabled=true;setAuthMessage("Вхід...","info");
    try{const session=await authApi("/auth/login",{method:"POST",body:{username,password,rememberMe},token:""});await completeAuthentication(session,rememberMe);}
    catch(error){setAuthMessage(error?.message||"Не вдалося увійти.","error");}
    finally{loginSubmit.disabled=false;}
  });

  registerForm?.addEventListener("submit",async event=>{
    event.preventDefault();const username=String(registerUsername?.value||"").trim(),password=String(registerPassword?.value||""),confirmation=String(registerPasswordConfirm?.value||""),rememberMe=!!registerRemember?.checked;
    if(username.length<3||username.length>32){setAuthMessage("Логін повинен містити від 3 до 32 символів.","error");return;}
    const passwordError=validateRegistrationPassword(password);if(passwordError){setAuthMessage(passwordError,"error");return;}
    if(password!==confirmation){setAuthMessage("Паролі не збігаються.","error");return;}
    registerSubmit.disabled=true;setAuthMessage("Створення акаунта...","info");
    try{
      const session=await authApi("/auth/register",{method:"POST",body:{username,password,rememberMe},token:""});
      await completeAuthentication(session,rememberMe);
    }
    catch(error){setAuthMessage(error?.message||"Не вдалося зареєструватися.","error");}
    finally{registerSubmit.disabled=false;}
  });

  forgotPasswordForm?.addEventListener("submit",async event=>{
    event.preventDefault();
    const username=String(loginUsername?.value||"").trim();
    if(!username){switchAuthMode("login");setAuthMessage("Спочатку введіть логін акаунта.","error");loginUsername?.focus();return;}
    forgotPasswordSubmit.disabled=true;setAuthMessage("Надсилання запиту...","info");
    try{
      const data=await authApi("/auth/recovery/request",{method:"POST",body:{username},token:""});
      setAuthMessage(data?.message||"Запит власнику сайту надіслано. Зв’яжіться з ним через Telegram або телефон.","success");
      await loadPublicRecoveryContact();
    }catch(error){setAuthMessage(error?.message||"Не вдалося надіслати запит на відновлення.","error");}
    finally{forgotPasswordSubmit.disabled=false;}
  });

  logoutAccount?.addEventListener("click",async()=>{
    const ok=confirm("Ви справді бажаєте покинути сайт та вийти з акаунта?");
    if(!ok){showButtonState(logoutAccount,"Скасовано","error");return;}
    logAction("Вихід: виконано вихід з акаунта.");
    showButtonState(logoutAccount,"Вихід...","error",0);
    try{await flushAuditQueue();}catch(_){}
    performLogout();
  });
  deleteAccountButton?.addEventListener("click",async()=>{
    if(!authUser){showButtonState(deleteAccountButton,"Немає акаунта","error");return;}
    if(authUser.is_owner){
      showButtonState(deleteAccountButton,"Недоступно","error",1500);
      alert("Головний адміністратор не може видалити свій акаунт, доки OWNER_USERNAME або OWNER_USER_ID вказує на нього.");
      return;
    }

    const username=String(authUser.username||"");
    const ok=confirm(
      `Ви справді бажаєте НАЗАВЖДИ видалити акаунт «${username}»?\n\n`+
      "Буде видалено сам акаунт, серверні сесії та історію входів. "+
      "Локальні дані цього акаунта на цьому пристрої також буде стерто. "+
      "Цю дію неможливо скасувати."
    );
    if(!ok){showButtonState(deleteAccountButton,"Скасовано","error");return;}

    const typed=prompt(`Для підтвердження введіть логін акаунта:\n${username}`);
    if(typed===null){showButtonState(deleteAccountButton,"Скасовано","error");return;}
    if(String(typed).trim()!==username){
      showButtonState(deleteAccountButton,"Логін не збігається","error");
      return;
    }

    deleteAccountButton.disabled=true;
    showButtonState(deleteAccountButton,"Видалення...","error",0);

    try{
      const deletingUserId=authUser.id;
      try{await flushAuditQueue();}catch(_){}
      await authApi("/auth/account",{method:"DELETE"});

      const prefix=`kbjv_8321_user_${String(deletingUserId)}_`;
      const removeKeys=[];
      for(let i=0;i<localStorage.length;i++){
        const key=localStorage.key(i);
        if(key&&key.startsWith(prefix))removeKeys.push(key);
      }
      removeKeys.forEach(key=>localStorage.removeItem(key));
      localStorage.removeItem(`kbjv_8321_legacy_migrated_v47_${deletingUserId}`);
      await clearAuditQueueForUser(deletingUserId);

      clearAuthSession();
      alert("Акаунт видалено.");
      window.location.reload();
    }catch(error){
      deleteAccountButton.disabled=false;
      showButtonState(deleteAccountButton,error?.status===0?"Немає мережі":"Помилка","error");
      alert(error?.message||"Не вдалося видалити акаунт.");
    }
  });
  adminRefresh?.addEventListener("click",()=>loadAdminUsers(true));
  adminOpenUsers?.addEventListener("click",()=>void openAdminUsersModal());
  adminTempPasswordCopy?.addEventListener("click",async()=>{
    const value=String(adminTempPasswordValue?.textContent||"").trim();
    if(!value||value==="—")return;
    if(await copyText(value))showButtonState(adminTempPasswordCopy,"Скопійовано","success",1000);
    else showButtonState(adminTempPasswordCopy,"Не скопійовано","error",1200);
  });
  adminTempPasswordClose?.addEventListener("click",()=>{showButtonState(adminTempPasswordClose,"Закрито","error",450);setTimeout(closeAdminTempPassword,180);});
  adminTempPasswordModal?.addEventListener("click",event=>{if(event.target===adminTempPasswordModal)closeAdminTempPassword();});
  adminUsersModalClose?.addEventListener("click",()=>{showButtonState(adminUsersModalClose,"Закрито","error");setTimeout(closeAdminUsersModal,260);});
  adminUsersModal?.addEventListener("click",event=>{if(event.target===adminUsersModal)closeAdminUsersModal();});
  adminOpenActionTypes?.addEventListener("click",openAdminActionTypes);
  adminActionTypesClose?.addEventListener("click",()=>{showButtonState(adminActionTypesClose,"Закрито","error");setTimeout(closeAdminActionTypes,260);});
  adminActionTypesModal?.addEventListener("click",event=>{if(event.target===adminActionTypesModal)closeAdminActionTypes();});
  adminFullStateSearch?.addEventListener("input",renderAdminStateSearch);
  adminLoginsClose?.addEventListener("click",()=>{
    showButtonState(adminLoginsClose,"Закрито","error");
    setTimeout(closeAdminLoginHistory,260);
  });
  adminLoginsModal?.addEventListener("click",event=>{if(event.target===adminLoginsModal)closeAdminLoginHistory();});
  adminFullClose?.addEventListener("click",()=>{
    showButtonState(adminFullClose,"Закрито","error");
    setTimeout(closeAdminFullInfo,260);
  });
  adminFullModal?.addEventListener("click",event=>{if(event.target===adminFullModal)closeAdminFullInfo();});

  // v83: зафіксований фон без position:fixed на body.
  // Модальні вікна — прямі нащадки body, тому фіксація body на iOS
  // зсувала ВСІ модалки вгору на попереднє window.scrollY.
  // Фіксуємо лише #main-app, залишаючи модалки прив’язаними до viewport.
  let modalLockedScrollY=0;
  let modalLockedScrollX=0;
  let modalPagePreviousStyles=null;
  const modalPage=document.getElementById("main-app");
  function syncModalScrollLock(){
    const activeModal=[...document.querySelectorAll(".product-modal.active")].some(modal=>getComputedStyle(modal).display!=="none");
    const locked=document.body.classList.contains("modal-scroll-locked");
    if(activeModal&&!locked){
      modalLockedScrollY=window.scrollY||window.pageYOffset||0;
      modalLockedScrollX=window.scrollX||window.pageXOffset||0;
      if(modalPage&&!modalPage.hidden){
        const rect=modalPage.getBoundingClientRect();
        modalPagePreviousStyles={
          top:modalPage.style.top,
          left:modalPage.style.left,
          width:modalPage.style.width
        };
        // Вимірюємо розміри ДО фіксації. Не міняємо масштаб і розкладку.
        modalPage.style.top=`${rect.top}px`;
        modalPage.style.left=`${rect.left}px`;
        modalPage.style.width=`${rect.width}px`;
        modalPage.classList.add("modal-page-locked");
      }
      document.documentElement.classList.add("modal-scroll-locked");
      document.body.classList.add("modal-scroll-locked");
    }else if(!activeModal&&locked){
      const restoreX=modalLockedScrollX;
      const restoreY=modalLockedScrollY;
      document.body.classList.remove("modal-scroll-locked");
      document.documentElement.classList.remove("modal-scroll-locked");
      if(modalPage){
        modalPage.classList.remove("modal-page-locked");
        if(modalPagePreviousStyles){
          modalPage.style.top=modalPagePreviousStyles.top;
          modalPage.style.left=modalPagePreviousStyles.left;
          modalPage.style.width=modalPagePreviousStyles.width;
        }
      }
      modalPagePreviousStyles=null;
      window.scrollTo(restoreX,restoreY);
    }else if(activeModal){
      document.documentElement.classList.add("modal-scroll-locked");
    }
  }

  window.addEventListener("online",()=>{recordSiteVisit();void flushAuditQueue();void syncStateNow({silent:true});void refreshSystemStatus({checkWorker:true});});
  window.addEventListener("offline",()=>renderSystemStatus());
  window.addEventListener("pageshow",()=>{recordSiteVisit();void syncStateNow({silent:true});});
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"){recordSiteVisit();void syncStateNow({silent:true});}});
  window.addEventListener("storage",event=>{
    if(!authUser||!event.key)return;
    const coreKeys=new Set([PRODUCTS_KEY,CALCULATOR_KEY,ARCHIVE_KEY,CALCULATOR_DRAFT_KEY,SORT_KEY,RANDOM_SORT_SEED_KEY,CATEGORY_ORDER_KEY,CUSTOM_CATEGORIES_KEY,DELETED_DEFAULT_CATEGORIES_KEY,DEPARTMENTS_ENABLED_KEY,PROFILE_KEY,CALC_QUICK_PRESETS_KEY,DAILY_GOAL_KEY,STATS_TO_TODAY_KEY,SITE_DATA_VISIBLE_KEY]);
    if(coreKeys.has(event.key))scheduleExternalReload();
    if([SYNC_DIRTY_KEY,SYNC_REVISION_KEY,SYNC_LAST_AT_KEY].includes(event.key))renderSystemStatus();
  });
  window.addEventListener("resize",scheduleTopTabFit);
  window.addEventListener("orientationchange",()=>setTimeout(scheduleTopTabFit,120));

  // v86: однакова верхня/нижня safe area для всіх модальних вікон.
  // Короткі діалоги залишаються по центру, довгі — під Dynamic Island.
  // Зміна active проходить до кадру рендерингу, тому немає стрибка вікна.
  const tallProductModalIds=new Set(["add-product-modal","edit-product-modal","delete-product-modal","product-order-modal"]);
  function syncModalLayout(modal){
    if(!modal.classList.contains("active"))return;
    const box=modal.querySelector(".product-modal-box");
    if(!box || !window.matchMedia("(max-width:768px)").matches)return;
    const css=getComputedStyle(modal);
    const available=modal.clientHeight-parseFloat(css.paddingTop)-parseFloat(css.paddingBottom);
    if(available<=0)return;
    const overflowed=box.scrollHeight>box.clientHeight+2;
    const nearlyFull=box.clientHeight>=available*0.76;
    const tall=tallProductModalIds.has(modal.id)||overflowed||nearlyFull;
    modal.classList.toggle("modal-content-tall",tall);
  }
  const modalScrollObserver=new MutationObserver(mutations=>{
    for(const mutation of mutations){
      const modal=mutation.target;
      const wasActive=(mutation.oldValue||"").split(/\s+/).includes("active");
      const active=modal.classList.contains("active");
      if(active&&!wasActive){
        const box=modal.querySelector(".product-modal-box");
        if(box)box.scrollTop=0;
        // Internally scrolling panels should also open from their beginning.
        modal.querySelectorAll(".product-order-list,.admin-full-list,.admin-logins-list,.admin-recovery-list").forEach(panel=>panel.scrollTop=0);
        syncModalLayout(modal);
      }else if(!active&&wasActive){
        modal.classList.remove("modal-content-tall");
      }
    }
    syncModalScrollLock();
  });
  const modalSizeObserver=typeof ResizeObserver==="function" ? new ResizeObserver(entries=>{
    for(const entry of entries){
      const modal=entry.target.closest(".product-modal");
      if(modal?.classList.contains("active"))syncModalLayout(modal);
    }
  }) : null;
  document.querySelectorAll(".product-modal").forEach(modal=>{
    modalScrollObserver.observe(modal,{attributes:true,attributeFilter:["class"],attributeOldValue:true});
    const box=modal.querySelector(".product-modal-box");
    if(box)modalSizeObserver?.observe(box);
  });
  window.addEventListener("resize",()=>document.querySelectorAll(".product-modal.active").forEach(syncModalLayout));
  syncModalScrollLock();

  refreshSiteButton?.addEventListener("click",async()=>{
    showButtonState(refreshSiteButton,"Оновлення...","success",0);
    logAction("Оновлення: запущено перевірку актуальної версії сайту.");
    safeStorageSet(ACTIVE_TAB_KEY,"blocks");
    try{
      if("serviceWorker" in navigator){
        const registration=await navigator.serviceWorker.getRegistration();
        if(registration)await registration.update();
      }
      try{
        await fetch(`./index.html?refresh=${Date.now()}`,{cache:"no-store"});
      }catch(_){}
    }catch(error){
      console.warn("Refresh update check failed:",error);
    }
    setTimeout(()=>window.location.reload(),250);
  });

  undoLastAction?.addEventListener("click",applyUndoSnapshot);
  systemStatusRefresh?.addEventListener("click",async()=>{showButtonState(systemStatusRefresh,"Оновлення...","info",0);await refreshSystemStatus({checkWorker:true});showButtonState(systemStatusRefresh,"Оновлено","success");});
  syncNowButton?.addEventListener("click",async()=>{syncNowButton.disabled=true;showButtonState(syncNowButton,"Синхронізація...","info",0);const ok=await syncStateNow();syncNowButton.disabled=false;showButtonState(syncNowButton,ok?"Синхронізовано":"Перевірте стан",ok?"success":"error");});
  syncUseServer?.addEventListener("click",async()=>{
    if(!confirm("Замінити локальні дані цього пристрою актуальною версією із сервера?\n\nПеред заміною рекомендується зробити експорт, якщо локальні зміни важливі."))return;
    const ok=await syncStateNow({preferServer:true});
    showButtonState(syncUseServer,ok?"Отримано":"Помилка",ok?"success":"error");
  });
  syncUseLocal?.addEventListener("click",async()=>{
    if(!confirm("Зберегти дані цього пристрою як основну серверну версію?\n\nНовіша версія з іншого пристрою буде замінена."))return;
    const ok=await syncStateNow({forceLocal:true});
    showButtonState(syncUseLocal,ok?"Збережено":"Помилка",ok?"success":"error");
  });

  clearSiteButton?.addEventListener("click",()=>{
    const ok=confirm("Ви справді бажаєте повністю очистити сайт для поточного акаунта?\n\nБуде видалено блоки КБЖВ, калькулятор, архів, статистику, консоль, денну ціль та локальні налаштування. Акаунт залишиться авторизованим.");
    if(!ok){showButtonState(clearSiteButton,"Скасовано","error",1600);return;}
    const keys=[PRODUCTS_KEY,CALCULATOR_KEY,ARCHIVE_KEY,ACTIVE_TAB_KEY,CALCULATOR_DRAFT_KEY,SORT_KEY,SORT_SCHEMA_KEY,RANDOM_SORT_SEED_KEY,CATEGORY_ORDER_KEY,CUSTOM_CATEGORIES_KEY,DELETED_DEFAULT_CATEGORIES_KEY,DEPARTMENTS_ENABLED_KEY,PROFILE_KEY,CALC_QUICK_PRESETS_KEY,CONSOLE_KEY,EXPORT_VERSION_KEY,DATABASE_UPDATED_KEY,EXPORT_FINGERPRINT_KEY,DAILY_GOAL_KEY,LAST_EXPORT_KEY,LAST_IMPORT_KEY,UNDO_KEY,STATS_TO_TODAY_KEY,SITE_DATA_VISIBLE_KEY];
    beginStorageTransaction("Повне очищення сайту");
    keys.forEach(key=>safeStorageRemove(key));
    safeStorageSet(ACTIVE_TAB_KEY,"blocks",{critical:true});
    markLocalDataChanged();
    if(!finishStorageTransaction()){
      showButtonState(clearSiteButton,"Не очищено","error",1800);
      alert(`Не вдалося повністю очистити дані. ${storageLastError||"Перевірте доступ до сховища браузера."}`);
      reloadPrimaryStateFromStorage();
      return;
    }
    queueAuditAction("Очищено локальні дані сайту для поточного акаунта.");
    try{sessionStorage.setItem("kbjv_8321_skip_login_log_once","1");}catch(_){}
    showButtonState(clearSiteButton,"Очищено","error",0);
    setTimeout(()=>window.location.reload(),450);
  });

  document.addEventListener("keydown",e=>{
    if(e.key!=="Escape")return;
    const openModals=[...document.querySelectorAll(".product-modal.active")];
    if(!openModals.length)return;
    e.preventDefault();
    // One Escape dismisses the topmost dialog; keeps stacked dialogs intact.
    const modal=openModals[openModals.length-1];
    if(modal===adminTempPasswordModal)closeAdminTempPassword();
    else if(modal===importPreviewModal)closeImportPreview();
    else {modal.classList.remove("active");if(modal===exportPreviewModal)pendingExport=null;}
    if(!document.querySelector(".product-modal.active"))document.body.classList.remove("edit-modal-open");
    if(modal===productModal)selectedProduct=null;
    if(modal===editProductModal)editingProduct=null;
    if([archiveTextModal,archiveCommentModal,archiveCompositionModal].includes(modal))archiveEditingId=null;
  });
  productWeight?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();productCopy.click();}});
  [newProductName,newProductKcal,newProductProtein,newProductFat,newProductCarb,newProductSugar,newProductSalt,newProductFiber,...newProductQuickWeights].forEach(i=>i?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();addProductSave.click();}}));
  [editProductName,editProductKcal,editProductProtein,editProductFat,editProductCarb,editProductSugar,editProductSalt,editProductFiber,...editProductQuickWeights].forEach(i=>i?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();editProductSave.click();}}));

  function initializeAuthenticatedApp(){
    if(appInitialized)return;appInitialized=true;
    departmentsEnabled=localStorage.getItem(DEPARTMENTS_ENABLED_KEY)!=="0";
    populateProductCategorySelects();
    currentSort=localStorage.getItem(SORT_KEY)||"categories";
    if(!localStorage.getItem(SORT_SCHEMA_KEY)){if(currentSort==="manual")currentSort="categories";safeStorageSet(SORT_KEY,currentSort,{critical:true});safeStorageSet(SORT_SCHEMA_KEY,"1",{critical:true});}
    if(!VALID_SORT_MODES.has(currentSort)){currentSort="categories";safeStorageSet(SORT_KEY,currentSort,{critical:true});}
    if(!departmentsEnabled&&currentSort==="categories"){currentSort="initial";safeStorageSet(SORT_KEY,currentSort,{critical:true});}
    updateSortOptionState();
    statsToTodayEnabled=localStorage.getItem(STATS_TO_TODAY_KEY)==="1";
    siteDataVisible=localStorage.getItem(SITE_DATA_VISIBLE_KEY)!=="0";
    products=loadArray(PRODUCTS_KEY).map((p,i)=>normalizeProduct(p,i));syncStatsToToday(false);calculatorItems=loadArray(CALCULATOR_KEY).map(normalizeCalculatorItem);archiveItems=loadArray(ARCHIVE_KEY);consoleItems=loadArray(CONSOLE_KEY).slice(-MAX_CONSOLE_ITEMS);
    const draft=localStorage.getItem(CALCULATOR_DRAFT_KEY);if(draft!==null&&calcInput)calcInput.value=draft;
    loadProfile();loadCalculatorQuickPresets();loadDailyGoal();
    // Перший запуск версійної синхронізації на старому пристрої: якщо локальні дані є,
    // не дозволяємо новішій серверній ревізії мовчки їх перезаписати.
    if(localStorage.getItem(SYNC_REVISION_KEY)===null&&localSnapshotHasData())safeStorageSet(SYNC_DIRTY_KEY,"1");
    syncStatusMessage=localStorage.getItem(SYNC_DIRTY_KEY)==="1"?"Є локальні зміни":(localStorage.getItem(SYNC_LAST_AT_KEY)?"Синхронізовано":"Ще не виконувалася");
    renderProducts();renderCalculatorLog();updateTotals();renderArchive();renderConsole();renderStatistics();updateSiteDataCounts();renderSystemStatus();void refreshSystemStatus({checkWorker:true});setInterval(()=>{updateSiteDataCounts();renderSystemStatus();if(document.visibilityState==="visible")void syncStateNow({silent:true});},60000);
    let saved=localStorage.getItem(ACTIVE_TAB_KEY)||"blocks";
    if(saved==="admin"&&authUser?.role!=="admin")saved="blocks";
    if(!["blocks","calculator","archive","console","profile","admin"].includes(saved))saved="blocks";
    activateAppPage(saved,{save:false});
    if(sessionStorage.getItem("kbjv_8321_skip_login_log_once")==="1")sessionStorage.removeItem("kbjv_8321_skip_login_log_once");
  }

  bootstrapAuthentication();
});
