import React from 'react';
import {
  Dimensions,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cardEnter } from '../utils/cardEnter';

const { width: SCREEN_W } = Dimensions.get('window');

const PURPLE_MAIN = '#6B21A8';
const PURPLE_DARK = '#1E1035';
const TEXT_MUTED = '#64748B';

const ABOUT_HERO_IMAGE = require('../assets/about/about-hero-banner.png');

export default function AboutScreen({ onBack, onExplore }) {
  const insets = useSafeAreaInsets();

  const handleCallSupport = () => {
    Linking.openURL('tel:7277277275').catch(() => {});
  };

  const handleOpenPrivacy = () => {
    Linking.openURL('https://evegah.cloud/privacy').catch(() => {});
  };

  const handleOpenTerms = () => {
    Linking.openURL('https://evegah.cloud/terms').catch(() => {});
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* Top Navigation Bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable
          hitSlop={12}
          onPress={onBack}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
        >
          <Ionicons name="arrow-back" size={20} color={PURPLE_DARK} />
        </Pressable>

        <Text style={styles.topBarTitle}>About Us</Text>

        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 36 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Hero Banner Illustration (Matches Figma/Mockup 1:1) */}
        <Animated.View entering={cardEnter(0)} style={styles.heroWrap}>
          <Image
            source={ABOUT_HERO_IMAGE}
            style={styles.heroImg}
            contentFit="cover"
            priority="high"
          />
        </Animated.View>

        {/* 2. Key Highlights Card (3 Pillars) */}
        <Animated.View entering={cardEnter(1)} style={styles.highlightsCard}>
          {/* 100% Electric */}
          <View style={styles.pillarItem}>
            <View style={[styles.pillarIconCircle, styles.pillarGreenBg]}>
              <Ionicons name="leaf" size={20} color="#16A34A" />
            </View>
            <Text style={styles.pillarTitle}>100% Electric</Text>
            <Text style={styles.pillarSub}>Zero Emissions</Text>
          </View>

          <View style={styles.pillarDivider} />

          {/* Sustainable */}
          <View style={styles.pillarItem}>
            <View style={[styles.pillarIconCircle, styles.pillarPurpleBg]}>
              <Ionicons name="flash" size={20} color="#7C3AED" />
            </View>
            <Text style={styles.pillarTitle}>Sustainable</Text>
            <Text style={styles.pillarSub}>Lower CO₂</Text>
          </View>

          <View style={styles.pillarDivider} />

          {/* Accessible */}
          <View style={styles.pillarItem}>
            <View style={[styles.pillarIconCircle, styles.pillarPurpleBg]}>
              <Ionicons name="people" size={20} color={PURPLE_MAIN} />
            </View>
            <Text style={styles.pillarTitle}>Accessible</Text>
            <Text style={styles.pillarSub}>For Everyone</Text>
          </View>
        </Animated.View>

        {/* 3. Our Mission Card */}
        <Animated.View entering={cardEnter(2)} style={styles.infoCard}>
          <View style={styles.infoIconBox}>
            <MaterialCommunityIcons name="bullseye-arrow" size={28} color="#7C3AED" />
          </View>
          <View style={styles.infoTextBox}>
            <Text style={styles.infoCardTitle}>Our Mission</Text>
            <Text style={styles.infoCardBody}>
              To build a smart, clean and sustainable mobility ecosystem through EV rentals.
            </Text>
          </View>
        </Animated.View>

        {/* 4. Our Vision Card */}
        <Animated.View entering={cardEnter(3)} style={styles.infoCard}>
          <View style={styles.infoIconBox}>
            <Ionicons name="eye-outline" size={26} color="#7C3AED" />
          </View>
          <View style={styles.infoTextBox}>
            <Text style={styles.infoCardTitle}>Our Vision</Text>
            <Text style={styles.infoCardBody}>
              To become the most trusted and widely used EV mobility platform across cities.
            </Text>
          </View>
        </Animated.View>

        {/* 5. Our Values Section */}
        <Animated.View entering={cardEnter(4)} style={styles.valuesSection}>
          <View style={styles.valuesHeaderRow}>
            <View style={styles.purplePillIndicator} />
            <Text style={styles.valuesHeading}>Our Values</Text>
          </View>

          <View style={styles.valuesGridRow}>
            {/* Sustainability */}
            <View style={styles.valueItem}>
              <View style={styles.valueCircle}>
                <Ionicons name="leaf" size={22} color={PURPLE_MAIN} />
              </View>
              <Text style={styles.valueLabel}>Sustainability</Text>
            </View>

            {/* Safety & Trust */}
            <View style={styles.valueItem}>
              <View style={styles.valueCircle}>
                <Ionicons name="shield-checkmark" size={22} color={PURPLE_MAIN} />
              </View>
              <Text style={styles.valueLabel}>Safety & Trust</Text>
            </View>

            {/* User First */}
            <View style={styles.valueItem}>
              <View style={styles.valueCircle}>
                <Ionicons name="people" size={22} color={PURPLE_MAIN} />
              </View>
              <Text style={styles.valueLabel}>User First</Text>
            </View>

            {/* Innovation */}
            <View style={styles.valueItem}>
              <View style={styles.valueCircle}>
                <Ionicons name="flash" size={22} color={PURPLE_MAIN} />
              </View>
              <Text style={styles.valueLabel}>Innovation</Text>
            </View>
          </View>
        </Animated.View>

        {/* 6. Impact Metric Numbers */}
        <Animated.View entering={cardEnter(5)} style={styles.impactCard}>
          <View style={styles.impactCol}>
            <Text style={styles.impactNumber}>2.6L+</Text>
            <Text style={styles.impactLabel}>Green Rides</Text>
          </View>
          <View style={styles.impactDivider} />
          <View style={styles.impactCol}>
            <Text style={styles.impactNumber}>25+</Text>
            <Text style={styles.impactLabel}>Smart Zones</Text>
          </View>
          <View style={styles.impactDivider} />
          <View style={styles.impactCol}>
            <Text style={styles.impactNumber}>4.8★</Text>
            <Text style={styles.impactLabel}>Rider Rating</Text>
          </View>
        </Animated.View>

        {/* 7. Action CTA Button */}
        {onExplore && (
          <Pressable
            onPress={onExplore}
            style={({ pressed }) => [
              styles.exploreBtn,
              pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] },
            ]}
          >
            <LinearGradient
              colors={['#4A168C', '#6B21A8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.exploreBtnGrad}
            >
              <Text style={styles.exploreBtnText}>Rent an Electric Scooter</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>
        )}

        {/* 8. Help / Call Support */}
        <Pressable
          onPress={handleCallSupport}
          style={({ pressed }) => [styles.supportLinkRow, pressed && { opacity: 0.75 }]}
        >
          <Ionicons name="call-outline" size={16} color={PURPLE_MAIN} />
          <Text style={styles.supportLinkText}>
            Need Help? Call 24×7 Support (7277277275)
          </Text>
        </Pressable>

        {/* 9. Legal & Versioning Footer */}
        <View style={styles.footerLegal}>
          <View style={styles.legalLinksRow}>
            <Pressable onPress={handleOpenPrivacy} hitSlop={8}>
              <Text style={styles.legalLinkText}>Privacy Policy</Text>
            </Pressable>
            <Text style={styles.legalDot}>•</Text>
            <Pressable onPress={handleOpenTerms} hitSlop={8}>
              <Text style={styles.legalLinkText}>Terms of Service</Text>
            </Pressable>
          </View>
          <Text style={styles.footerCopyright}>
            © {new Date().getFullYear()} Evegah Mobility Private Limited · v1.4.0
          </Text>
        </View>

        {/* Subtle decorative bottom wave accent */}
        <LinearGradient
          colors={['rgba(243, 232, 255, 0)', 'rgba(233, 213, 255, 0.45)']}
          style={styles.bottomWaveAccent}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAF9FE',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#FAF9FE',
    zIndex: 10,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 5,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  backBtnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: PURPLE_DARK,
    letterSpacing: -0.2,
  },
  topBarSpacer: {
    width: 42,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 4,
  },
  heroWrap: {
    width: SCREEN_W,
    height: SCREEN_W * (335 / 472),
    overflow: 'hidden',
    backgroundColor: '#FAF9FE',
  },
  heroImg: {
    width: '100%',
    height: '100%',
  },
  highlightsCard: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: {
        shadowColor: '#6B21A8',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  pillarItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillarIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  pillarGreenBg: {
    backgroundColor: '#E8F7EE',
  },
  pillarPurpleBg: {
    backgroundColor: '#F3E8FF',
  },
  pillarTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  pillarSub: {
    fontSize: 11.5,
    color: TEXT_MUTED,
    marginTop: 2,
    textAlign: 'center',
  },
  pillarDivider: {
    width: 1,
    height: 44,
    backgroundColor: '#F1F5F9',
  },
  infoCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: {
        shadowColor: '#6B21A8',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  infoIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  infoTextBox: {
    flex: 1,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  infoCardBody: {
    fontSize: 13,
    color: TEXT_MUTED,
    lineHeight: 18.5,
  },
  valuesSection: {
    marginHorizontal: 16,
    marginTop: 22,
  },
  valuesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  purplePillIndicator: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: PURPLE_MAIN,
    marginRight: 8,
  },
  valuesHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  valuesGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  valueItem: {
    alignItems: 'center',
    width: (SCREEN_W - 32) / 4 - 4,
  },
  valueCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  valueLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
    lineHeight: 15,
  },
  impactCard: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: '#FAF5FF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  impactCol: {
    flex: 1,
    alignItems: 'center',
  },
  impactNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: PURPLE_MAIN,
    letterSpacing: -0.2,
  },
  impactLabel: {
    fontSize: 11.5,
    fontWeight: '500',
    color: TEXT_MUTED,
    marginTop: 2,
  },
  impactDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E9D5FF',
  },
  exploreBtn: {
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: PURPLE_MAIN,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  exploreBtnGrad: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  exploreBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  supportLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    gap: 6,
  },
  supportLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: PURPLE_MAIN,
  },
  footerLegal: {
    marginTop: 22,
    alignItems: 'center',
  },
  legalLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  legalLinkText: {
    fontSize: 12,
    color: TEXT_MUTED,
    textDecorationLine: 'underline',
  },
  legalDot: {
    fontSize: 12,
    color: '#CBD5E1',
  },
  footerCopyright: {
    fontSize: 11,
    color: '#94A3B8',
  },
  bottomWaveAccent: {
    height: 40,
    width: '100%',
    marginTop: 16,
  },
});
