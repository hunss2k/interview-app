/**
 * 클라이언트에서 오디오를 WAV 청크로 변환
 * Web Audio API로 모든 브라우저 지원 오디오를 PCM WAV로 변환
 * Whisper 25MB 제한에 맞게 시간 기준 분할
 */

// Whisper 제한: 25MB. 대용량 청크 전송 시 Connection error 방지를 위해 작게 분할.
// 16kHz mono 16bit = 32,000 bytes/sec → 300초 = ~9.6MB
const MAX_SECONDS_PER_CHUNK = 300; // 5분 (~9.6MB, 안정적 전송)

export interface AudioChunk {
  blob: Blob;
  ext: string;
  index: number;
  total: number;
}

/**
 * 오디오를 WAV로 변환하고, 필요 시 Whisper 25MB 제한에 맞게 분할
 */
export async function convertToWavChunks(audioSource: Blob | File): Promise<AudioChunk[]> {
  try {
    const arrayBuffer = await audioSource.arrayBuffer();
    const audioCtx = new AudioContext({ sampleRate: 16000 });
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    await audioCtx.close();

    const totalSamples = audioBuffer.length;
    const samplesPerChunk = MAX_SECONDS_PER_CHUNK * audioBuffer.sampleRate;
    const chunkCount = Math.ceil(totalSamples / samplesPerChunk);

    // 모노 채널 데이터
    const channelData = getMonoData(audioBuffer);

    const chunks: AudioChunk[] = [];
    for (let i = 0; i < chunkCount; i++) {
      const start = i * samplesPerChunk;
      const end = Math.min(start + samplesPerChunk, totalSamples);
      const chunkData = channelData.subarray(start, end);
      const wavBlob = encodeWav(chunkData, audioBuffer.sampleRate);
      chunks.push({ blob: wavBlob, ext: 'wav', index: i, total: chunkCount });
    }

    console.log(`오디오 변환: ${audioBuffer.duration.toFixed(1)}초, ${chunks.length}개 청크, 원본=${formatBytes(audioSource.size)}, WAV총=${formatBytes(chunks.reduce((s, c) => s + c.blob.size, 0))}`);
    return chunks;
  } catch (err) {
    console.warn('WAV 변환 실패, 원본 사용:', err);
    const ext = audioSource instanceof File
      ? (audioSource.name.split('.').pop()?.toLowerCase() || 'm4a')
      : 'webm';
    return [{ blob: audioSource, ext, index: 0, total: 1 }];
  }
}

/** 하위 호환용 단일 파일 변환 */
export async function convertToWav(audioSource: Blob | File): Promise<{ blob: Blob; ext: string }> {
  const chunks = await convertToWavChunks(audioSource);
  // 단일 청크면 그대로, 여러개면 첫번째만 (실제로는 convertToWavChunks 사용 권장)
  return { blob: chunks[0].blob, ext: chunks[0].ext };
}

function getMonoData(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) {
    return buffer.getChannelData(0);
  }
  const ch0 = buffer.getChannelData(0);
  const ch1 = buffer.getChannelData(1);
  const mono = new Float32Array(ch0.length);
  for (let i = 0; i < ch0.length; i++) {
    mono[i] = (ch0[i] + ch1[i]) / 2;
  }
  return mono;
}

function encodeWav(channelData: Float32Array, sampleRate: number): Blob {
  const bitDepth = 16;
  const numChannels = 1;
  const dataLength = channelData.length * (bitDepth / 8);
  const totalLength = 44 + dataLength;

  const arrayBuffer = new ArrayBuffer(totalLength);
  const view = new DataView(arrayBuffer);

  // WAV 헤더
  writeString(view, 0, 'RIFF');
  view.setUint32(4, totalLength - 8, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
  view.setUint16(32, numChannels * (bitDepth / 8), true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  // PCM 데이터
  let offset = 44;
  for (let i = 0; i < channelData.length; i++) {
    const sample = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
