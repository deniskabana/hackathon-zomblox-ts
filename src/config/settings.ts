export const DEFAULT_SETTINGS = {
  volume: { master: 1, music: 1, effects: 1 },
  debug: { enableFlowFieldRender: true },
};

export type Settings = typeof DEFAULT_SETTINGS;
