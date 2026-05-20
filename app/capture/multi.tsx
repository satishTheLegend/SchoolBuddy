import { useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { useAuth } from '@/stores/auth';
import { generateKit } from '@/lib/capture';
import { uploadMultiCapture } from '@/lib/multi-capture';

export default function MultiCaptureScreen() {
  const user = useAuth((s) => s.user);
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [pages, setPages] = useState<string[]>([]);
  const [shooting, setShooting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleShoot = async () => {
    if (!cameraRef.current || shooting) return;
    setShooting(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      });
      if (!photo?.uri) throw new Error('No photo returned');
      setPages((prev) => [...prev, photo.uri]);
    } catch (e) {
      Alert.alert('Capture failed', (e as Error).message);
    } finally {
      setShooting(false);
    }
  };

  const handleRemovePage = (index: number) => {
    setPages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDone = async () => {
    if (!user) return;
    if (pages.length === 0) {
      Alert.alert('No pages', 'Capture at least one photo before continuing.');
      return;
    }
    setUploading(true);
    try {
      const { captureId } = await uploadMultiCapture(user.id, pages);
      generateKit(captureId).catch((e) => console.warn('generateKit', e));
      router.replace(`/capture/${captureId}`);
    } catch (e) {
      Alert.alert('Upload failed', (e as Error).message);
    } finally {
      setUploading(false);
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
          SnapStudy needs the camera to capture multi-page notes.
        </Text>
        <Button label="Allow camera" onPress={requestPermission} />
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

      {/* Top bar: close + page counter */}
      <SafeAreaView edges={['top']} className="absolute top-0 left-0 right-0">
        <View className="flex-row items-center justify-between px-4 py-2">
          <Pressable
            onPress={() => {
              if (pages.length > 0) {
                Alert.alert(
                  'Discard pages?',
                  `${pages.length} captured page${pages.length === 1 ? '' : 's'} will be lost.`,
                  [
                    { text: 'Keep shooting', style: 'cancel' },
                    {
                      text: 'Discard',
                      style: 'destructive',
                      onPress: () => router.back(),
                    },
                  ],
                );
              } else {
                router.back();
              }
            }}
            className="bg-bg-card/90 rounded-full px-4 py-2"
          >
            <Text className="text-ink text-sm">Close</Text>
          </Pressable>
          <View className="bg-bg-card/90 rounded-full px-3 py-1">
            <Text className="text-ink text-xs font-semibold">
              {pages.length} page{pages.length === 1 ? '' : 's'}
            </Text>
          </View>
          <View className="w-16" />
        </View>
      </SafeAreaView>

      {/* Bottom bar: thumbnail strip + shutter + done */}
      <SafeAreaView edges={['bottom']} className="absolute bottom-0 left-0 right-0">
        {pages.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
            className="py-2"
          >
            {pages.map((uri, i) => (
              <Pressable
                key={`${uri}-${i}`}
                onLongPress={() =>
                  Alert.alert('Remove page', `Remove page ${i + 1}?`, [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Remove',
                      style: 'destructive',
                      onPress: () => handleRemovePage(i),
                    },
                  ])
                }
              >
                <View className="relative">
                  <Image
                    source={{ uri }}
                    style={{ width: 60, height: 80, borderRadius: 8 }}
                  />
                  <View className="absolute top-1 left-1 bg-black/60 rounded-full px-1.5">
                    <Text className="text-white text-[10px] font-semibold">
                      {i + 1}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}

        <View className="flex-row items-center justify-around p-6">
          <View className="w-20 items-center">
            <Text className="text-white/70 text-[10px] mt-1">
              Long-press to remove
            </Text>
          </View>

          <Pressable
            onPress={handleShoot}
            disabled={shooting || uploading}
            className="bg-white rounded-full w-20 h-20 items-center justify-center"
          >
            {shooting ? (
              <ActivityIndicator color="#0B0F19" />
            ) : (
              <View className="bg-bg rounded-full w-16 h-16 border-4 border-white" />
            )}
          </Pressable>

          <Pressable
            onPress={handleDone}
            disabled={uploading || pages.length === 0}
            className={`rounded-full w-20 h-14 items-center justify-center ${
              pages.length === 0 ? 'bg-bg-card/40' : 'bg-accent'
            }`}
          >
            {uploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-sm font-semibold">Done</Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
