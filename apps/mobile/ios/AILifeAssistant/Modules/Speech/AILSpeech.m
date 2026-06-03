//
//  AILSpeech.m
//
//  Objective-C export for the Swift `AILSpeech` class.
//
//  React Native discovers native modules at runtime by scanning for classes
//  that declare themselves with the RCT_EXPORT_MODULE macro. Swift classes
//  cannot use that macro directly (it relies on Obj-C runtime metadata), so
//  we declare the export here and let Swift implement the methods.
//
//  Under the New Architecture (Bridgeless), RN 0.85 ships a TurboModule
//  interop layer that auto-bridges modules declared this way. For a pure
//  TurboModule, the codegen spec at `src/native/speech/AILSpeechSpec.ts`
//  would generate `NativeAILSpeechSpec.h`, and this file would `#import` and
//  conform to it. The interop layer means we don't need that today — but the
//  spec is in place so we can flip later without rewriting Swift.

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(AILSpeech, RCTEventEmitter)

RCT_EXTERN_METHOD(getPermissionStatus:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(requestPermissions:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(isAvailable:(NSString *)locale
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(start:(NSDictionary *)options
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(stop:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(cancel:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
