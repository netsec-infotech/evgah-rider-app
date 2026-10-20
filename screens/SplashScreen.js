import React, { useEffect, useRef } from 'react';
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useVideoPlayer, VideoView } from 'expo-video';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Video & brand assets
const SPLASH_VIDEO = require('../assets/splash.mp4');
const LOGO_ASSET = require('../assets/logo.png');

export default function SplashScreen({ onFinish }) {
  const insets = useSafeAreaInsets();
  const finishedRef = useRef(false);

  const handleFinish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish?.();
  };

  // Video player configured with muted volume
  const player = useVideoPlayer(SPLASH_VIDEO, (instance) => {
    instance.loop = false;
    instance.muted = true;
    instance.volume = 0.0;
    instance.play();
  });

  useEffect(() => {
    if (player) {
      player.muted = true;
      player.volume = 0.0;
      player.play();

      const endSub = player.addListener('playToEnd', () => {
        handleFinish();
      });

      return () => {
        endSub?.remove?.();
      };
    }
  }, [player]);

  // Fallback timer so user isn't stuck if video playback stalls
  useEffect(() => {
    const timer = setTimeout(() => {
      handleFinish();
    }, 4200);

    return () => clearTimeout(timer);
  }, []);

  // Animated logo at top of the page
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.82);
  const logoTranslateY = useSharedValue(-20);
  const logoFloat = useSharedValue(0);
  const auraScale = useSharedValue(0.9);
  const auraOpacity = useSharedValue(0.2);

  useEffect(() => {
    // 1. Entrance animation
    logoOpacity.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });
    logoScale.value = withSpring(1, { damping: 14, stiffness: 120 });
    logoTranslateY.value = withSpring(0, { damping: 16, stiffness: 110 });

    // 2. Ambient floating movement
    logoFloat.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    // 3. Ambient aura pulse behind logo
    auraScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.9, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    auraOpacity.value = withRepeat(
      withSequence(
        withTiming(0.55, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.2, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [
      { scale: logoScale.value },
      { translateY: logoTranslateY.value + logoFloat.value },
    ],
  }));

  const auraAnimatedStyle = useAnimatedStyle(() => ({
    opacity: auraOpacity.value,
    transform: [{ scale: auraScale.value }],
  }));

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent backgroundColor="transparent" />

      {/* Video Background with muted volume */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <VideoView
          player={player}
          style={styles.videoPlayer}
          contentFit="cover"
          surfaceType="textureView"
          nativeControls={false}
          allowsPictureInPicture={false}
        />
        {/* Soft atmospheric gradient overlay for readability & brand cohesion */}
        <LinearGradient
          colors={['rgba(8, 4, 20, 0.65)', 'rgba(8, 4, 20, 0.15)', 'rgba(8, 4, 20, 0.75)']}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFillObject}
        />
      </View>

      {/* Animated Brand Logo at the Top of the Page */}
      <View style={[styles.topHeader, { paddingTop: Math.max(insets.top + 14, 38) }]}>
        <Animated.View style={[styles.logoWrapper, logoAnimatedStyle]}>
          <Image
            source={LOGO_ASSET}
            style={styles.logoImage}
            contentFit="contain"
            priority="high"
          />
        </Animated.View>
      </View>

      {/* Bottom Skip / Get Started CTA */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom + 18, 28) }]}>
        <Pressable
          style={({ pressed }) => [
            styles.skipButton,
            pressed && { opacity: 0.75, transform: [{ scale: 0.98 }] },
          ]}
          onPress={handleFinish}
          hitSlop={12}
        >
          <Text style={styles.skipButtonText}>Continue ➔</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05020C',
    position: 'relative',
  },
  videoPlayer: {
    width: SCREEN_W,
    height: SCREEN_H,
  },
  topHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  auraBackdrop: {
    position: 'absolute',
    top: 30,
    width: 220,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(108, 56, 255, 0.35)',
    filter: 'blur(30px)',
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  logoImage: {
    width: Math.min(SCREEN_W * 0.68, 260),
    height: 76,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
    paddingHorizontal: 24,
  },
  skipButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 24,
    backdropFilter: 'blur(10px)',
  },
  skipButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
