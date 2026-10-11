#pragma once

#include <jni.h>

#include <cstdint>

#ifdef __cplusplus
extern "C" {
#endif

JNIEXPORT jint JNICALL Java_com_biotap_native_BioTapModule_nativeComputeCrc32(JNIEnv* env,
                                                                              jclass clazz,
                                                                              jbyteArray data);

JNIEXPORT jboolean JNICALL Java_com_biotap_native_BioTapModule_nativeVerifyCrc32(JNIEnv* env,
                                                                                 jclass clazz,
                                                                                 jbyteArray data,
                                                                                 jint expectedCrc);

#ifdef __cplusplus
}
#endif
