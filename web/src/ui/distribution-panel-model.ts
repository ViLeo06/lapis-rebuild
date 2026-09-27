export type DistributionState =
  | 'NO_PACK'
  | 'CHECKING'
  | 'DOWNLOADING'
  | 'VERIFYING'
  | 'INSTALLING'
  | 'READY'
  | 'UPDATE_AVAILABLE'
  | 'REPAIR_REQUIRED'
  | 'ERROR'
  | 'OFFLINE_READY';

export type DistributionActionKey =
  | 'enterGame'
  | 'downloadFullPack'
  | 'importFullPack'
  | 'checkUpdate'
  | 'applyUpdate'
  | 'repair';

export interface DistributionProgress {
  totalBytes?: number;
  downloadedBytes?: number;
  currentAsset?: string;
  status?: string;
  failure?: string;
}

export interface DistributionSnapshot {
  state: DistributionState;
  installedVersion?: string;
  targetVersion?: string;
  progress?: DistributionProgress;
  message?: string;
}

export interface DistributionViewModel {
  title: string;
  summary: string;
  stateLabel: string;
  actions: readonly DistributionActionKey[];
  showProgress: boolean;
  indeterminate: boolean;
  percent: number;
  downloadedText: string;
  totalText: string;
  stepText: string;
  currentAssetText?: string;
  errorText?: string;
  versionText?: string;
}

const ACTION_LABELS: Record<DistributionActionKey, string> = {
  enterGame: '进入游戏',
  downloadFullPack: '下载完整资源',
  importFullPack: '导入完整资源包',
  checkUpdate: '检查更新',
  applyUpdate: '立即更新',
  repair: '修复资源',
};

const STATE_LABELS: Record<DistributionState, string> = {
  NO_PACK: '需要安装资源',
  CHECKING: '正在检查',
  DOWNLOADING: '正在下载',
  VERIFYING: '正在校验',
  INSTALLING: '正在安装',
  READY: '可以开始',
  UPDATE_AVAILABLE: '发现更新',
  REPAIR_REQUIRED: '需要修复',
  ERROR: '操作失败',
  OFFLINE_READY: '离线可用',
};

function finiteNonNegative(value: number | undefined): number {
  return Number.isFinite(value) && Number(value) > 0 ? Number(value) : 0;
}

export function distributionProgressPercent(progress: DistributionProgress | undefined): number {
  const total = finiteNonNegative(progress?.totalBytes);
  const downloaded = finiteNonNegative(progress?.downloadedBytes);
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((downloaded / total) * 100)));
}

export function formatDistributionBytes(value: number | undefined): string {
  const bytes = finiteNonNegative(value);
  if (bytes < 1024) return Math.round(bytes) + ' B';
  const units = ['KB', 'MB', 'GB', 'TB'];
  let amount = bytes / 1024;
  let index = 0;
  while (amount >= 1024 && index < units.length - 1) {
    amount /= 1024;
    index += 1;
  }
  const digits = amount >= 100 ? 0 : amount >= 10 ? 1 : 2;
  return String(Number(amount.toFixed(digits))) + ' ' + units[index];
}

function actionsFor(snapshot: DistributionSnapshot): readonly DistributionActionKey[] {
  switch (snapshot.state) {
    case 'NO_PACK':
      return ['downloadFullPack', 'importFullPack'];
    case 'READY':
      return ['enterGame', 'checkUpdate', 'repair'];
    case 'UPDATE_AVAILABLE':
      return ['applyUpdate', 'enterGame', 'repair'];
    case 'REPAIR_REQUIRED':
      return ['repair', 'checkUpdate'];
    case 'OFFLINE_READY':
      return ['enterGame', 'repair'];
    case 'ERROR':
      return snapshot.installedVersion
        ? ['enterGame', 'checkUpdate', 'repair']
        : ['downloadFullPack', 'importFullPack'];
    default:
      return [];
  }
}

function summaryFor(snapshot: DistributionSnapshot): string {
  if (snapshot.message) return snapshot.message;
  switch (snapshot.state) {
    case 'NO_PACK':
      return '需要先安装游戏资源。可以在线下载完整资源，也可以导入已有的完整资源包。';
    case 'CHECKING':
      return '正在检查资源版本，请稍候。';
    case 'DOWNLOADING':
      return '正在下载所需资源。已有且未变化的资源不会重复下载。';
    case 'VERIFYING':
      return '下载完成，正在检查资源完整性。';
    case 'INSTALLING':
      return '正在安装资源。完成后即可进入游戏。';
    case 'READY':
      return '游戏资源已准备好。';
    case 'UPDATE_AVAILABLE':
      return snapshot.targetVersion
        ? '发现资源更新 ' + snapshot.targetVersion + '，可只更新变化的内容。'
        : '发现资源更新，可只更新变化的内容。';
    case 'REPAIR_REQUIRED':
      return '检测到资源缺失或损坏，可以只修复异常内容。';
    case 'ERROR':
      return '本次操作没有完成。请查看下方提示后重试。';
    case 'OFFLINE_READY':
      return '资源已安装。当前没有网络，也可以进入游戏。';
  }
}

function defaultStep(snapshot: DistributionSnapshot): string {
  switch (snapshot.state) {
    case 'CHECKING': return '检查可用版本';
    case 'DOWNLOADING': return '下载资源';
    case 'VERIFYING': return '校验资源';
    case 'INSTALLING': return '安装资源';
    case 'UPDATE_AVAILABLE': return '等待更新';
    case 'REPAIR_REQUIRED': return '等待修复';
    case 'READY': return '资源就绪';
    case 'OFFLINE_READY': return '离线资源就绪';
    case 'ERROR': return '操作中断';
    case 'NO_PACK': return '等待安装';
  }
}

export function getDistributionViewModel(snapshot: DistributionSnapshot): DistributionViewModel {
  const progress = snapshot.progress;
  const showProgress =
    snapshot.state === 'CHECKING' ||
    snapshot.state === 'DOWNLOADING' ||
    snapshot.state === 'VERIFYING' ||
    snapshot.state === 'INSTALLING';
  const totalBytes = finiteNonNegative(progress?.totalBytes);
  const downloadedBytes = finiteNonNegative(progress?.downloadedBytes);
  const errorText = snapshot.state === 'ERROR'
    ? progress?.failure || snapshot.message || '请检查网络或资源文件后重试。'
    : progress?.failure;
  const versionBits = [
    snapshot.installedVersion ? '当前 ' + snapshot.installedVersion : '',
    snapshot.targetVersion && snapshot.targetVersion !== snapshot.installedVersion
      ? '目标 ' + snapshot.targetVersion
      : '',
  ].filter(Boolean);

  return {
    title: '游戏资源',
    summary: summaryFor(snapshot),
    stateLabel: STATE_LABELS[snapshot.state],
    actions: actionsFor(snapshot),
    showProgress,
    indeterminate: showProgress && totalBytes <= 0,
    percent: distributionProgressPercent(progress),
    downloadedText: formatDistributionBytes(downloadedBytes),
    totalText: totalBytes > 0 ? formatDistributionBytes(totalBytes) : '未知',
    stepText: progress?.status || defaultStep(snapshot),
    currentAssetText: progress?.currentAsset,
    errorText,
    versionText: versionBits.length > 0 ? versionBits.join(' · ') : undefined,
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function actionButton(
  action: DistributionActionKey,
  disabled: boolean,
  primary: boolean,
): string {
  const className = primary ? 'lapis-distribution-action is-primary' : 'lapis-distribution-action';
  return '<button type="button" class="' + className + '" data-action="' + action + '"' +
    (disabled ? ' disabled aria-disabled="true"' : '') + '>' +
    escapeHtml(ACTION_LABELS[action]) + '</button>';
}

export function renderDistributionPanelMarkup(
  snapshot: DistributionSnapshot,
  options: {
    busy?: boolean;
    disabledActions?: readonly DistributionActionKey[];
  } = {},
): string {
  const view = getDistributionViewModel(snapshot);
  const disabled = new Set(options.disabledActions || []);
  const busy = options.busy === true;
  const actionMarkup = view.actions
    .map((action, index) => actionButton(action, busy || disabled.has(action), index === 0))
    .join('');
  const progressMarkup = view.showProgress
    ? '<section class="lapis-distribution-progress" aria-label="资源进度">' +
      '<div class="lapis-distribution-progress-head"><span>' + escapeHtml(view.stepText) + '</span><b>' +
      (view.indeterminate ? '处理中' : String(view.percent) + '%') + '</b></div>' +
      '<div class="lapis-distribution-progress-track" role="progressbar" aria-label="资源下载进度" aria-valuemin="0" aria-valuemax="100"' +
      (view.indeterminate ? '' : ' aria-valuenow="' + String(view.percent) + '"') + '>' +
      '<span class="' + (view.indeterminate ? 'is-indeterminate' : '') + '" style="width:' +
      (view.indeterminate ? '35' : String(view.percent)) + '%"></span></div>' +
      '<div class="lapis-distribution-progress-size"><span>已完成 ' + escapeHtml(view.downloadedText) +
      '</span><span>总计 ' + escapeHtml(view.totalText) + '</span></div>' +
      (view.currentAssetText
        ? '<div class="lapis-distribution-current" title="' + escapeHtml(view.currentAssetText) + '">当前文件：' +
          escapeHtml(view.currentAssetText) + '</div>'
        : '') +
      '</section>'
    : '';
  const errorMarkup = view.errorText
    ? '<div class="lapis-distribution-error" role="alert">' + escapeHtml(view.errorText) + '</div>'
    : '';
  const versionMarkup = view.versionText
    ? '<div class="lapis-distribution-version">' + escapeHtml(view.versionText) + '</div>'
    : '';
  const importInput = view.actions.includes('importFullPack')
    ? '<input class="lapis-distribution-file" data-role="pack-file" type="file" accept=".lapispak,application/zip,application/octet-stream" aria-label="选择完整资源包">'
    : '';

  return '<section class="lapis-distribution-panel" role="dialog" aria-modal="true" aria-labelledby="lapis-distribution-title" data-state="' +
    snapshot.state + '" aria-busy="' + String(busy) + '">' +
    '<header class="lapis-distribution-header"><div><span class="lapis-distribution-kicker">佣兵传说重构</span>' +
    '<h1 id="lapis-distribution-title">' + escapeHtml(view.title) + '</h1></div>' +
    '<span class="lapis-distribution-state">' + escapeHtml(view.stateLabel) + '</span></header>' +
    '<div class="lapis-distribution-content"><div class="lapis-distribution-copy">' +
    '<p>' + escapeHtml(view.summary) + '</p>' + versionMarkup + errorMarkup + '</div>' +
    progressMarkup + '</div>' +
    '<footer class="lapis-distribution-actions" aria-label="资源操作">' + actionMarkup + importInput + '</footer>' +
    '</section>';
}
