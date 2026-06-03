/**
 * TurboModule Codegen spec for AILSpeech.
 *
 * This file IS NOT IMPORTED at runtime. React Native's codegen tool reads it
 * at build time to generate `NativeAILSpeechSpec.h/.mm`, which the Swift
 * module can conform to for pure TurboModule integration.
 *
 * Today we ship via the legacy bridge (with the New-Arch interop layer),
 * because:
 *   - `RCTEventEmitter` from a Swift class works seamlessly under interop.
 *   - Pure TurboModule event emitter codegen still has rough edges on Swift.
 *
 * To migrate to a pure TurboModule:
 *   1. Run `npx react-native codegen` to regenerate native headers.
 *   2. Make `AILSpeech.swift` conform to the generated `NativeAILSpeechSpec`.
 *   3. Delete `AILSpeech.m` (no longer needed — TurboModule registers itself).
 */
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  getPermissionStatus(): Promise<{
    speech: string;
    microphone: string;
  }>;

  requestPermissions(): Promise<{
    speech: string;
    microphone: string;
    granted: boolean;
  }>;

  isAvailable(locale: string): Promise<{
    supported: boolean;
    onDevice: boolean;
    available: boolean;
  }>;

  start(options: {
    locale?: string;
    onDevice?: boolean;
    partialResults?: boolean;
    contextualStrings?: string[];
  }): Promise<{ started: boolean; locale: string }>;

  stop(): Promise<{ stopped: boolean }>;
  cancel(): Promise<{ cancelled: boolean }>;

  // Event subscription is handled by RN's emitter infrastructure under the
  // hood; codegen accepts these method shapes for parity with iOS native.
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('AILSpeech');
