import { useState, useRef } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { useAuth } from '@/stores/auth';
import { generateKit, uploadCapture } from '@/lib/capture';

export default function CaptureScreen() {
  const user = useAuth((s) => s.user);
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);

  const handleCapture = async () => {
    if (!user) return;
    if (!cameraRef.current) return;

    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      });
      if (!photo?.uri) throw new Error('No photo returned');
      const { captureId } = await uploadCapture(user.id, photo.uri);
      generateKit(captureId).catch((e) => console.warn('generateKit', e));
      router.push(`/capture/${captureId}`);
    } catch (e) {
      Alert.alert('Capture failed', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handlePickPhoto = async () => {
    if (!user) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (result.canceled) return;
    const uri = result.assets[0]?.uri;
    if (!uri) return;
    setBusy(true);
    try {
      const { captureId } = await uploadCapture(user.id, uri);
      generateKit(captureId).catch((e) => console.warn('generateKit', e));
      router.push(`/capture/${captureId}`);
    } catch (e) {
      Alert.alert('Upload failed', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!permission) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator color="#7C5CFF" />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center px-8">
        <Text className="text-ink text-xl font-semibold text-center mb-2">
          Allow camera
        </Text>
        <Text className="text-ink-muted text-center mb-6">
          SnapStudy needs the camera to turn your notes into flashcards.
        </Text>
        <Button label="Allow camera" onPress={requestPermission} />
        <View className="mt-3">
          <Button label="Pick from library" variant="secondary" onPress={handlePickPhoto} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing="back"
        autofocus="on"
      />
      <SafeAreaView edges={['bottom']} className="absolute bottom-0 left-0 right-0">
        <View className="flex-row items-center justify-around p-6">
          <Pressable
            onPress={handlePickPhoto}
            className="bg-bg-card/90 rounded-full w-14 h-14 items-center justify-center"
          >
            <Text className="text-ink text-xs">Library</Text>
          </Pressable>

          <Pressable
            onPress={handleCapture}
            disabled={busy}
            className="bg-white rounded-full w-20 h-20 items-center justify-center"
          >
            {busy ? (
              <ActivityIndicator color="#0B0F19" />
            ) : (
              <View className="bg-bg rounded-full w-16 h-16 border-4 border-white" />
            )}
          </Pressable>

          <Pressable
            onPress={() => router.back()}
            className="bg-bg-card/90 rounded-full w-14 h-14 items-center justify-center"
          >
            <Text className="text-ink text-xs">Close</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
