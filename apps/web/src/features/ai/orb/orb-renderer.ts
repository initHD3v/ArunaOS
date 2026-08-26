import { ORB_SHADER_SOURCE } from './orb-shader';
import { getOrbParams, styleFlowIndexes, type OrbParams, type OrbStyleName } from './orb-params';

export const orbUniformFloatCount = 128;
const orbColorOffset = 32;

const paletteStops = [
  '#F7FBFF',
  '#EFF6FD',
  '#E0EEF9',
  '#D4E6F7',
  '#BBD5F3',
  '#A6C7F0',
  '#87B0EB',
  '#6F9EE8',
  '#6F9EE8',
  '#6F9EE8',
  '#6F9EE8',
  '#6F9EE8',
] as const;

function rgb(hex: string): [number, number, number, number] {
  const value = hex.slice(1);
  return [
    Number.parseInt(value.slice(0, 2), 16) / 255,
    Number.parseInt(value.slice(2, 4), 16) / 255,
    Number.parseInt(value.slice(4, 6), 16) / 255,
    1,
  ];
}

function writeOrbUniforms(
  target: Float32Array,
  width: number,
  height: number,
  time: number,
  params: OrbParams,
): void {
  target.fill(0);
  target[0] = width;
  target[1] = height;
  target[2] = time;

  target.set(
    [
      params.speed,
      params.radius,
      params.zoom,
      params.warp,
      params.ridgeAmt,
      params.sharp,
      params.shade,
      params.sheen,
      params.gloss,
      params.shellMidAlpha,
      params.shellEdgeAlpha,
      params.exposure,
      styleFlowIndexes[params.style],
      params.edgeSoftness,
      params.edgeGlow,
      0,
      params.glassEnabled ? 1 : 0,
      params.glassOpacity,
      params.contourDeform,
      params.bandDensity,
      params.chromaticShift,
      params.metalScale,
      params.metalStretch,
      params.metalAngle,
      params.metalOffset,
      params.metalPhase,
      params.metalEvolution,
      params.metalRoughness,
      params.metalDepth,
    ],
    3,
  );

  const colors = [
    params.colorA,
    params.colorB,
    params.colorC,
    params.colorD,
    params.highlightColor,
    params.shellInner,
    params.shellMid,
    params.shellEdge,
    params.sheenColor,
    params.specColor,
    params.canvasColor,
    params.glowColor,
    ...paletteStops,
  ];
  colors.forEach((hex, index) => target.set(rgb(hex), orbColorOffset + index * 4));
}

/* Minimal WebGPU type surface — avoids adding @webgpu/types for one effect. */
interface GpuShaderModule {
  getCompilationInfo(): Promise<{
    messages: readonly { type: string; lineNum: number; linePos: number; message: string }[];
  }>;
}
interface GpuBuffer {
  readonly byteLength?: number;
}
interface GpuBindGroupLayout {
  __brand?: never;
}
interface GpuRenderPipeline {
  getBindGroupLayout(index: number): GpuBindGroupLayout;
}
interface GpuRenderPass {
  setPipeline(pipeline: GpuRenderPipeline): void;
  setBindGroup(index: number, bindGroup: GpuBindGroup): void;
  draw(vertexCount: number): void;
  end(): void;
}
interface GpuBindGroup {
  __brand?: never;
}
interface GpuCommandEncoder {
  beginRenderPass(desc: {
    colorAttachments: {
      view: GpuTextureView;
      clearValue: { r: number; g: number; b: number; a: number };
      loadOp: 'clear';
      storeOp: 'store';
    }[];
  }): GpuRenderPass;
  finish(): GpuCommandBuffer;
}
interface GpuCommandBuffer {
  __brand?: never;
}
interface GpuQueue {
  writeBuffer(buffer: GpuBuffer, offset: number, data: Float32Array): void;
  submit(commands: GpuCommandBuffer[]): void;
}
interface GpuTextureView {
  __brand?: never;
}
interface GpuDevice {
  createShaderModule(desc: { label: string; code: string }): GpuShaderModule;
  createRenderPipeline(desc: unknown): GpuRenderPipeline;
  createBuffer(desc: { size: number; usage: number }): GpuBuffer;
  createBindGroup(
    layout: GpuBindGroupLayout,
    desc: { entries: { binding: number; resource: { buffer: GpuBuffer } }[] },
  ): GpuBindGroup;
  queue: GpuQueue;
  createCommandEncoder(): GpuCommandEncoder;
  destroy(): void;
  lost: Promise<{ reason?: string; message?: string }>;
  addEventListener(
    type: 'uncapturederror',
    listener: (event: { preventDefault(): void; error: { message: string } }) => void,
  ): void;
}
interface GpuAdapter {
  requestDevice(): Promise<GpuDevice>;
}
interface GpuCanvasContext {
  configure(config: { device: GpuDevice; format: string; alphaMode: 'premultiplied' }): void;
  getCurrentTexture(): { createView(): GpuTextureView };
}

const GPU_BUFFER_USAGE_UNIFORM = 0x40;
const GPU_BUFFER_USAGE_COPY_DST = 0x08;

function getGpuNavigator(): {
  gpu?: { requestAdapter(): Promise<GpuAdapter | null>; getPreferredCanvasFormat(): string };
} | null {
  if (typeof navigator === 'undefined') return null;
  return navigator as Navigator & {
    gpu?: { requestAdapter(): Promise<GpuAdapter | null>; getPreferredCanvasFormat(): string };
  };
}

export function isWebGPUAvailable(): boolean {
  return getGpuNavigator()?.gpu != null;
}

export type OrbRendererOptions = {
  canvas: HTMLCanvasElement;
  style: OrbStyleName;
  onError?: (error: Error) => void;
  /** Mutable speed multiplier read every frame (e.g. { current: 2 } while "thinking"). */
  speedScale?: { current: number };
};

/**
 * Creates a WebGPU renderer for the liquid orb. Returns a dispose function.
 * Adapted from LerSent001/orb `src/orb-renderer.ts` (MIT).
 */
export function createOrbRenderer({
  canvas,
  style,
  onError,
  speedScale,
}: OrbRendererOptions): () => void {
  let disposed = false;
  let animationFrame = 0;
  let device: GpuDevice | null = null;
  let failed = false;

  function fail(error: Error): void {
    if (disposed || failed) return;
    failed = true;
    cancelAnimationFrame(animationFrame);
    device?.destroy();
    onError?.(error);
  }

  function start(): Promise<void> {
    const gpu = getGpuNavigator()?.gpu;
    if (!gpu) return Promise.reject(new Error('WebGPU not supported'));
    if (!canvas.getContext) return Promise.reject(new Error('No canvas context'));

    return gpu.requestAdapter().then(async (adapter) => {
      if (!adapter || disposed) throw new Error('No WebGPU adapter');
      device = await adapter.requestDevice();
      if (disposed) {
        device.destroy();
        return;
      }

      const context = canvas.getContext('webgpu') as unknown as GpuCanvasContext | null;
      if (!context) throw new Error('Cannot create webgpu context');
      const gpuContext: GpuCanvasContext = context;

      const format = gpu.getPreferredCanvasFormat();
      context.configure({ device, format, alphaMode: 'premultiplied' });

      const shader = device.createShaderModule({
        label: 'orb-glass-liquid',
        code: ORB_SHADER_SOURCE,
      });
      const compilation = await shader.getCompilationInfo();
      const errors = compilation.messages.filter((m) => m.type === 'error');
      if (errors.length > 0) {
        throw new Error(errors.map((m) => `${m.lineNum}:${m.linePos} ${m.message}`).join('\n'));
      }

      const pipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: { module: shader, entryPoint: 'vs_main' },
        fragment: { module: shader, entryPoint: 'fs_main', targets: [{ format }] },
        primitive: { topology: 'triangle-list' },
      });
      const values = new Float32Array(orbUniformFloatCount);
      const uniformBuffer = device.createBuffer({
        size: values.byteLength,
        usage: GPU_BUFFER_USAGE_UNIFORM | GPU_BUFFER_USAGE_COPY_DST,
      });
      const bindGroup = device.createBindGroup(pipeline.getBindGroupLayout(0), {
        entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
      });
      const startedAt = performance.now();

      device.lost.then((info) =>
        fail(new Error(`WebGPU device lost: ${info?.message || info?.reason || 'unknown'}`)),
      );
      device.addEventListener('uncapturederror', (event) => {
        event.preventDefault();
        fail(new Error(`WebGPU render error: ${event.error.message}`));
      });

      function resize(): void {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
        const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }
      }

      function frame(now: number): void {
        if (disposed || failed || !device) return;

        try {
          resize();
          writeOrbUniforms(
            values,
            canvas.width,
            canvas.height,
            ((now - startedAt) / 1000) * (speedScale?.current ?? 1),
            getOrbParams(style),
          );
          device.queue.writeBuffer(uniformBuffer, 0, values);

          const encoder = device.createCommandEncoder();
          const pass = encoder.beginRenderPass({
            colorAttachments: [
              {
                view: gpuContext.getCurrentTexture().createView(),
                clearValue: { r: 0, g: 0, b: 0, a: 0 },
                loadOp: 'clear',
                storeOp: 'store',
              },
            ],
          });
          pass.setPipeline(pipeline);
          pass.setBindGroup(0, bindGroup);
          pass.draw(3);
          pass.end();
          device.queue.submit([encoder.finish()]);
          animationFrame = requestAnimationFrame(frame);
        } catch (error) {
          fail(error instanceof Error ? error : new Error(String(error)));
        }
      }

      animationFrame = requestAnimationFrame(frame);
    });
  }

  start().catch((error: unknown) => {
    fail(error instanceof Error ? error : new Error(String(error)));
  });

  return () => {
    disposed = true;
    cancelAnimationFrame(animationFrame);
    device?.destroy();
  };
}
