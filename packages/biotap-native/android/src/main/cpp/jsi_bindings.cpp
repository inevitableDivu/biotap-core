#include "jsi_bindings.h"

#include "apdu_chunker.hpp"

extern "C" {

JNIEXPORT jint JNICALL Java_com_biotap_native_BioTapModule_nativeComputeCrc32(JNIEnv* env,
                                                                              jclass /* clazz */,
                                                                              jbyteArray data) {
    if (data == nullptr)
        return 0;
    jsize len = env->GetArrayLength(data);
    jbyte* bytes = env->GetByteArrayElements(data, nullptr);

    uint32_t crc = biotap::ApduChunker::computeCrc32(reinterpret_cast<const uint8_t*>(bytes),
                                                     static_cast<size_t>(len));

    env->ReleaseByteArrayElements(data, bytes, JNI_ABORT);
    return static_cast<jint>(crc);
}

JNIEXPORT jboolean JNICALL Java_com_biotap_native_BioTapModule_nativeVerifyCrc32(JNIEnv* env,
                                                                                 jclass /* clazz */,
                                                                                 jbyteArray data,
                                                                                 jint expectedCrc) {
    if (data == nullptr)
        return JNI_FALSE;
    jsize len = env->GetArrayLength(data);
    jbyte* bytes = env->GetByteArrayElements(data, nullptr);

    bool isValid = biotap::ApduChunker::verifyChecksum(reinterpret_cast<const uint8_t*>(bytes),
                                                       static_cast<size_t>(len),
                                                       static_cast<uint32_t>(expectedCrc));

    env->ReleaseByteArrayElements(data, bytes, JNI_ABORT);
    return isValid ? JNI_TRUE : JNI_FALSE;
}
}
