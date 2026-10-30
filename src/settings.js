import { DEFAULT_HAND } from './default_hand.js';
import { h5DeviceSelectOptions } from './h5/index.js';
import { PRESET_ORDER } from './level.js';
export const SETTINGS_VERSION = 10;
export const STORE_KEY = 'voxelShootTool.settings';
export const APP_ID = 'voxel-shoot-tool';
export const APP_VERSION = '1.3.6';

const levelOpts = [
  ...PRESET_ORDER.map(id => [id, ({
    sphere_cage: '笼球（白肋+彩块）', diamond_cage: '笼方', cat: '小猫',
    house: '小房子', icecream: '冰淇淋', watermelon: '西瓜',
  })[id] || id]),
  ['random', '随机（基于笼球扰动）'],
];

export const GROUPS = [
  ['画布与关卡', [
    ['canvasW', '画布宽度(px)', 'range', 720, 360, 1440, 2],
    ['canvasH', '画布高度(px)', 'range', 1280, 640, 2560, 2],
    ['level', '关卡', 'select', 'sphere_cage', levelOpts],
    ['seed', '随机种子', 'range', 1, 1, 9999, 1],
    ['maxAmmo', '单块最多弹药', 'range', 88, 10, 200, 1],
    ['ammoStep', '弹药取整步长', 'range', 5, 1, 20, 1],
    ['startSlots', '开局预填槽位数', 'range', 2, 0, 5, 1],
    ['voxScale', '体素整体缩放', 'range', 0.52, 0.3, 1.8, 0.01],
    ['targetRotSpeed', '目标旋转速度(°/秒)', 'range', 10, 0, 90, 1],
    ['targetTiltX', '目标俯仰(弧度)', 'range', 0.88, -0.6, 1.2, 0.01],
    ['melonTiltX', '西瓜俯仰(弧度)', 'range', 1.12, -1.4, 1.5, 0.01],
  ]],
  ['外观', [
    ['bgColor', '背景色（参考深蓝）', 'color', '#243A63'],
    ['titleText', '顶部文案', 'text', '这游戏太上头了'],
    ['titleSize', '顶部字号', 'range', 46, 16, 72, 1],
    ['titleY', '顶部文字Y', 'range', 52, 10, 160, 1],
    ['titleColor', '顶部文字颜色', 'color', '#0a0a0a'],
    ['col_green', '绿色', 'color', '#7CFC00'],
    ['col_orange', '橙色', 'color', '#FF8A1F'],
    ['col_yellow', '黄色', 'color', '#FFD400'],
    ['col_red', '红色', 'color', '#ff3b4a'],
    ['col_blue', '蓝色', 'color', '#3a7cff'],
    ['col_purple', '紫色', 'color', '#9b4dff'],
    ['col_white', '白色', 'color', '#F5F7FA'],
    ['col_pink', '粉色', 'color', '#ff6ad0'],
    ['col_black', '黑色', 'color', '#2a2a30'],
    ['col_cyan', '青色', 'color', '#3ad8e8'],
    ['col_brown', '棕色', 'color', '#8b5a2b'],
    ['col_tan', '米色', 'color', '#d4a574'],
    ['col_cream', '奶油色', 'color', '#f5e6c8'],
    ['slotColor', '槽位凹槽颜色', 'color', '#15263E'],
    ['voxGap', '方块间缝(负=重叠)', 'range', -0.04, -0.08, 0.3, 0.005],
    ['voxRound', '方块圆角', 'range', 0.16, 0, 0.45, 0.01],
    ['outline3d', '卡通描边', 'range', 0.7, 0, 2, 0.05],
    ['ballR', '小球半径', 'range', 0.15, 0.08, 0.8, 0.01],
    ['ballGlow', '小球自发光', 'range', 1.25, 0, 2.5, 0.05],
    ['ballHalo', '小球光晕半径', 'range', 1.65, 1, 2.8, 0.05],
    ['ballHaloOp', '小球光晕不透明度', 'range', 0.22, 0, 0.8, 0.01],
    ['invScale', '库存块缩放', 'range', 1.05, 0.6, 2.2, 0.01],
  ]],
  ['3D 渲染', [
    ['cam3dFov', '相机 FOV(°)', 'range', 30, 8, 60, 0.5],
    ['cam3dX', '相机 X', 'range', 0, -40, 40, 0.1],
    ['cam3dY', '相机 Y', 'range', 11, 2, 40, 0.1],
    ['cam3dZ', '相机 Z', 'range', 35, 5, 50, 0.1],
    ['cam3dTX', '目标 X', 'range', 0, -20, 20, 0.1],
    ['cam3dTY', '目标 Y', 'range', 7.0, -5, 20, 0.1],
    ['cam3dTZ', '目标 Z', 'range', 0, -10, 20, 0.1],
    ['targetY', '体素中心高度', 'range', 9.5, 2, 14, 0.1],
    ['slotY', '槽位高度', 'range', 1.05, 0, 4, 0.05],
    ['slotZ', '槽位纵深 Z', 'range', 6.6, 2, 14, 0.05],
    ['slotSpan', '槽位总跨度', 'range', 10.8, 4, 16, 0.1],
    ['invY', '库存高度', 'range', 0.55, 0, 3, 0.05],
    ['invZ', '库存纵深 Z', 'range', 8.6, 4, 18, 0.05],
    ['invCell', '库存格距', 'range', 1.28, 0.8, 2.5, 0.05],
    ['light3dSun', '主光强度', 'range', 2.7, 0, 6, 0.05],
    ['light3dAmbient', '环境光', 'range', 0.85, 0, 4, 0.05],
    ['light3dAzim', '主光方位角', 'range', 320, 0, 360, 1],
    ['light3dElev', '主光仰角', 'range', 62, 5, 90, 1],
    ['uiDepth', 'UI锚点深度', 'range', 16, 6, 28, 0.5],
    ['uiScale', 'UI立体块缩放', 'range', 0.37, 0.2, 1.5, 0.01],
    ['mat3dRough', '默认粗糙度', 'range', 0.45, 0, 1, 0.01],
    ['voxRough', '体素粗糙度', 'range', 0.38, 0, 1, 0.01],
    ['tankRough', '炮台粗糙度', 'range', 0.18, 0, 1, 0.01],
  ]],
  ['玩法与动画', [
    ['fireRate', '射速(发/秒)', 'range', 18, 1, 40, 0.5],
    ['ballSpeed', '球速(格/秒)', 'range', 22, 5, 120, 1],
    ['ballArc', '球弧线高度', 'range', 1.8, 0, 8, 0.1],
    ['gravity', '碎屑重力', 'range', 28, 0, 80, 1],
    ['flyDur', '库存飞入槽位(ms)', 'range', 320, 80, 1200, 10],
    ['flyArc', '飞入弧高', 'range', 3.2, 0, 8, 0.1],
    ['leaveDur', '弹药打光离场(ms)', 'range', 280, 50, 1500, 10],
    ['popDur', '方块消除(ms)', 'range', 200, 0, 800, 10],
    ['jellyPop', '果冻挤压强度', 'range', 1.15, 0, 2, 0.05],
    ['debrisCount', '碎屑数', 'range', 26, 0, 40, 1],
    ['debrisLife', '碎屑寿命(ms)', 'range', 900, 100, 2500, 50],
    ['debrisSize', '碎屑尺寸', 'range', 0.28, 0.05, 0.8, 0.01],
    ['debrisSpread', '碎屑飞散', 'range', 2.5, 0.2, 4.5, 0.05],
    ['sparkCount', '命中白雾数', 'range', 18, 0, 32, 1],
    ['sparkLife', '白雾寿命(ms)', 'range', 580, 80, 1400, 10],
    ['sparkSpread', '白雾飞散', 'range', 7.5, 0.5, 16, 0.1],
    ['flashLife', '命中闪光(ms)', 'range', 200, 60, 600, 10],
    ['flashSize', '命中闪光尺寸', 'range', 2.8, 0.5, 6, 0.1],
    ['bobAmp', '炮台呼吸幅度', 'range', 0.06, 0, 0.4, 0.01],
    ['bobPeriod', '呼吸周期(ms)', 'range', 600, 200, 2000, 10],
    ['recoil', '射击后坐', 'range', 0.24, 0, 0.6, 0.01],
    ['winEnabled', '目标清空时通关', 'bool', true],
    ['loseRule', '失败判定', 'select', 'on', [['on', '无空槽且无法继续射击 → 失败'], ['off', '不判失败']]],
  ]],
  ['文字', [
    ['discShow', '显示底部免责声明', 'bool', false],
    ['discText', '底部文字', 'text', '广告素材宣传场景'],
    ['discSize', '底部字号', 'range', 18, 10, 36, 1],
    ['discY', '底部文字Y(距底)', 'range', 8, 0, 120, 1],
    ['winText', '通关文字', 'text', '通关！'],
    ['loseText', '失败文字', 'text', '没有空位了'],
  ]],
  ['音效', [
    ['sfxMute', '静音', 'bool', false],
    ['sfxVolume', '总音量', 'range', 0.75, 0, 1.5, 0.01],
    ['sfxPop', '点击/飞入', 'bool', true],
    ['sfxPopVol', '点击/飞入 音量', 'range', 1, 0, 2, 0.01],
    ['sfxShoot', '射击', 'bool', true],
    ['sfxShootVol', '射击 音量', 'range', 0.85, 0, 2, 0.01],
    ['sfxShootMax', '射击音每秒最多', 'range', 16, 1, 60, 1],
    ['sfxHit', '命中', 'bool', true],
    ['sfxHitVol', '命中 音量', 'range', 0.75, 0, 2, 0.01],
    ['sfxWhoosh', '离场', 'bool', true],
    ['sfxWhooshVol', '离场 音量', 'range', 1, 0, 2, 0.01],
    ['sfxChime', '通关', 'bool', true],
    ['sfxChimeVol', '通关 音量', 'range', 1, 0, 2, 0.01],
    ['sfxError', '失败', 'bool', true],
    ['sfxErrorVol', '失败 音量', 'range', 1, 0, 2, 0.01],
  ]],
  ['手指 / 自动通关', [
    ['autoSpeed', '整体速度倍率', 'range', 1, 0.25, 6, 0.05],
    ['moveMin', '移动耗时最小(ms)', 'range', 320, 50, 2000, 10],
    ['moveMax', '移动耗时最大(ms)', 'range', 580, 50, 3000, 10],
    ['delayMin', '点击间隔最小(ms)', 'range', 100, 0, 2000, 10],
    ['delayMax', '点击间隔最大(ms)', 'range', 320, 0, 4000, 10],
    ['thinkChance', '思考停顿概率', 'range', 0.1, 0, 0.6, 0.01],
    ['thinkMax', '思考停顿最长(ms)', 'range', 700, 0, 4000, 50],
    ['jitter', '落点抖动(px)', 'range', 8, 0, 40, 1],
    ['handSize', '手指大小(画面宽比例)', 'range', 0.42, 0.1, 0.9, 0.01],
    ['handAnchorX', '指尖锚点 X(0~1)', 'range', 0.2204, 0, 1, 0.0001],
    ['handAnchorY', '指尖锚点 Y(0~1)', 'range', 0.0367, 0, 1, 0.0001],
    ['handRotation', '手指旋转(度)', 'range', 8, -60, 60, 1],
    ['handFlip', '手指水平翻转', 'bool', false],
    ['handImage', '上传手指图片(透明PNG；默认=麻将同款)', 'file', DEFAULT_HAND],
    ['pressEnabled', '点击按下效果', 'bool', true],
    ['pressDepth', '按压幅度', 'range', 0.16, 0, 0.35, 0.01],
    ['tapRipple', '点击波纹（参考无）', 'bool', false],
    ['handShow', '显示手指', 'bool', true],
    ['hideCursor', '手指出现时隐藏鼠标', 'bool', true],
    ['handRest', '等待时手指移到一旁', 'bool', true],
    ['autoStartDelay', '开始前等待(ms)', 'range', 350, 0, 5000, 50],
    ['manualHand', '手动游玩也显示手指跟随', 'bool', false],
  ]],
  ['录制', [
    ['recFps', '帧率', 'range', 30, 15, 60, 1],
    ['recFormat', '格式', 'select', 'auto', [['auto', '自动(优先 MP4)'], ['mp4', 'MP4'], ['webm', 'WebM']]],
    ['recBitrate', '码率(Mbps)', 'range', 8, 1, 30, 0.5],
    ['autoRec', '自动通关开始时自动录制（默认关）', 'bool', false],
    ['autoStop', '通关后停止录制并下载', 'bool', true],
    ['tailSec', '通关后继续录制(秒)', 'range', 2.0, 0, 10, 0.1],
  ]],
  ['导出 AE 工程', [
    ['_aeToggle', '记录 AE 时间轴', 'button', 'aeToggle', '● 开始记录'],
    ['_aeExport', '重新导出上一次记录', 'button', 'aeExport', '⬇ 导出 ZIP'],
    ['aeWithRec', '录制视频时同步记录', 'bool', true],
    ['aeFps', 'AE 合成帧率', 'select', '30', [['24', '24'], ['25', '25'], ['30', '30'], ['60', '60']]],
    ['aeSize', 'AE 合成尺寸', 'select', 'canvas', [['canvas', '同画布'], ['720x1280', '720×1280'], ['1080x1920', '1080×1920']]],
    ['aeSampling', '关键帧方式', 'select', 'reduce', [['reduce', '精简'], ['bake', '逐帧烘焙']]],
    ['aeVoxels', '方块图层', 'select', 'visible', [['visible', '可见方块'], ['all', '全部']]],
    ['aeNames', '图层命名', 'select', 'zh', [['zh', '中文'], ['en', 'English']]],
    ['aeAudio', '音频', 'select', 'both', [['both', '混合+逐事件'], ['mixed', '仅混合'], ['events', '仅逐事件'], ['none', '无']]],
    ['aeSaveAep', '提示另存为 .aep', 'bool', true],
  ]],
  ['导出 3D 动画（UE5 / C4D / Blender）', [
    ['_export3d', '导出 3D 动画', 'button', 'export3d', '导出 3D 动画 (glTF/FBX/Blender)'],
    ['export3dFps', '3D 帧率', 'select', '30', [['24', '24'], ['25', '25'], ['30', '30'], ['60', '60']]],
    ['export3dHand', '包含手指', 'bool', true],
  ]],
  ['导出 H5 试玩广告', [
    ['_exportH5', '导出 H5 试玩 ZIP', 'button', 'exportH5', '⬇ 导出 H5 试玩 ZIP'],
    ['h5Format', '渠道格式', 'select', 'applovin,facebook,google,mintegral,moloco,tiktok,unity,generic', [['applovin,facebook,google,mintegral,moloco,tiktok,unity,generic', '全部 8 渠道'], ['tiktok,generic', 'TikTok + Generic'], ['applovin', 'AppLovin'], ['facebook', 'Facebook'], ['google', 'Google'], ['mintegral', 'Mintegral'], ['moloco', 'Moloco'], ['tiktok', 'TikTok'], ['unity', 'Unity'], ['generic', 'Generic']]],
    ['h5Orientation', '试玩方向', 'select', '1', [['0', '双端'], ['1', '竖屏'], ['2', '横屏']]],
    ['h5Device', '预览机型', 'select', 'adaptive', h5DeviceSelectOptions()],
    ['h5DeviceW', '预览宽度', 'range', 390, 240, 1440, 1],
    ['h5DeviceH', '预览高度', 'range', 844, 400, 2560, 1],
    ['h5CtaText', 'CTA 文案', 'text', '立即下载'],
    ['h5StoreUrl', '商店 URL', 'text', 'https://play.google.com/store/apps/details?id=com.example.game'],
    ['h5GameName', '游戏名', 'text', '体素射击'],
    ['h5Icon', '应用图标', 'file', ''],
    ['h5MaxMb', '体积告警(MB)', 'range', 5, 1, 20, 0.5],
    ['h5AutoPlay', '打开后自动通关演示', 'bool', false],
  ]],
  ['结束页(End Card)', [
    ['endCard', '显示结束页', 'bool', false],
    ['endCardHand', '结束页显示手指', 'bool', false],
    ['endDelay', '出现延迟(ms)', 'range', 800, 0, 5000, 50],
    ['endTitle', '标题', 'text', '立即下载 挑战更多关卡'],
  ]],
];
export const DEFS = {};
for (const [, items] of GROUPS) for (const it of items) if (it[2] !== 'button') DEFS[it[0]] = it[3];

export function migrate(obj) {
  if (!obj || typeof obj !== 'object') return { ...DEFS };
  let v = obj.version || 0; const s = { ...(obj.settings || obj) };
  if (v < 1) {
    const mv = (o, n, f = x => x) => { if (o in s) { if (!(n in s)) s[n] = f(s[o]); delete s[o]; } };
    mv('handImg', 'handImage'); mv('sfxVol', 'sfxVolume'); mv('sfx', 'sfxMute', x => !x);
    v = 1;
  }
  const OLD = {
    2: {
      bgColor: '#1a2744', cam3dFov: 42, cam3dY: 18, cam3dZ: 28, cam3dTY: 3.5, cam3dTZ: 5,
      targetY: 9.2, slotZ: 8.5, invZ: 12.5, invCell: 1.4, voxScale: 0.75, invScale: 1.2,
      col_green: '#6fdc3a', titleSize: 42, ballR: 0.28, debrisCount: 10,
    },
    3: {
      cam3dFov: 42, cam3dY: 18.5, cam3dZ: 27.5, cam3dTY: 6.2, cam3dTZ: 5.5,
      targetY: 10.8, voxScale: 0.82,
    },
    4: {
      cam3dFov: 32, cam3dY: 12.5, cam3dZ: 28, cam3dTY: 9.5, cam3dTZ: 0,
      targetY: 9.5, voxScale: 1.0, maxAmmo: 120,
    },
    5: {
      /* restore 3D UI; keep band-friendly cam from v4 DEFS */
    },
    6: {
      targetTiltX: 0.58, melonTiltX: -0.72, tankRough: 0.28, ballSpeed: 38, /* v6 clears old tilts */
    },
    7: {
      uiScale: 0.38, invScale: 1.2,
    },
    8: {
      uiScale: 0.36,
    },
    9: {
      ballR: 0.18, ballGlow: 0.65, ballHaloOp: 0.06, fireRate: 16, ballSpeed: 28,
      debrisCount: 14, recoil: 0.08,
    },
    10: {
      debrisCount: 20, sparkCount: 14, ballGlow: 1.05, recoil: 0.2,
    },
  };
  for (const nv of Object.keys(OLD).map(Number).sort((a,b)=>a-b)) if (v < nv) {
    for (const k in OLD[nv]) if (s[k] === OLD[nv][k]) delete s[k];
    v = nv;
  }
  const out = { ...DEFS };
  for (const k in DEFS) if (k in s && typeof s[k] === typeof DEFS[k]) out[k] = s[k];
  return out;
}
export function loadSettings() {
  try { const raw = localStorage.getItem(STORE_KEY); if (raw) return migrate(JSON.parse(raw)); } catch (e) { }
  return { ...DEFS };
}
export function saveSettings(S) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ version: SETTINGS_VERSION, settings: S })); } catch (e) { console.warn('save fail', e); }
}
export function exportJSON(S) { return JSON.stringify({ app: APP_ID, version: SETTINGS_VERSION, settings: S }, null, 2); }
