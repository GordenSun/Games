import { decodeAudio } from "./audio.js";

export async function loadAssets(assetList, onProgress = () => {}) {
  const total = assetList.length || 1;
  let loaded = 0;
  const assets = {};
  onProgress({ ratio: 0, loaded, total, label: "准备加载" });

  for (const asset of assetList) {
    onProgress({ ratio: loaded / total, loaded, total, label: asset.path });
    try {
      assets[asset.name] = await loadOne(asset);
    } catch (error) {
      error.message = `加载失败：${asset.path}\n${error.message}`;
      throw error;
    }
    loaded += 1;
    onProgress({ ratio: loaded / total, loaded, total, label: asset.path });
  }
  return assets;
}

async function loadOne(asset) {
  if (asset.type === "font") {
    const face = new FontFace(asset.name, `url(${asset.path})`);
    await face.load();
    document.fonts.add(face);
    return face;
  }

  const response = await fetch(asset.path);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  const blob = await response.blob();

  if (asset.type === "audio") {
    const buffer = await blob.arrayBuffer();
    return decodeAudio(buffer);
  }

  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}
