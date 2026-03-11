import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Animated,
  Image,
  ImageBackground,
  useWindowDimensions,
  TouchableOpacity,
  FlatList,
  Easing,
} from "react-native";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { PLANT_ASSETS } from "../constants/PlantAssets";

const FAR_BG = require("../assets/far_background.png");
const GARDEN_BG = require("../assets/garden_BG.png");
const STORAGE_PAGE_ID = "storage";

const POT_IMAGE = require("../assets/plants/pot.png");
const TROPHY_POT_IMAGES = {
  bronze: require("../assets/plants/pot_b.png"),
  silver: require("../assets/plants/pot_s.png"),
  gold: require("../assets/plants/pot_g.png"),
};

const TROPHY_FERN_IMAGES = {
  bronze: {
    stage1: require("../assets/plants/fern_stage1_b.png"),
    stage2: require("../assets/plants/fern_stage2_b.png"),
    stage3: require("../assets/plants/fern_stage3_b.png"),
    stage4: require("../assets/plants/fern_stage4_b.png"),
  },
  silver: {
    stage1: require("../assets/plants/fern_stage1_s.png"),
    stage2: require("../assets/plants/fern_stage2_s.png"),
    stage3: require("../assets/plants/fern_stage3_s.png"),
    stage4: require("../assets/plants/fern_stage4_s.png"),
  },
  gold: {
    stage1: require("../assets/plants/fern_stage1_g.png"),
    stage2: require("../assets/plants/fern_stage2_g.png"),
    stage3: require("../assets/plants/fern_stage3_g.png"),
    stage4: require("../assets/plants/fern_stage4_g.png"),
  },
};

function getStoragePlantRating(plant) {
  if (plant?.shelfPosition?.pageId !== STORAGE_PAGE_ID) return null;

  const longestStreak = Number(plant?.longestStreak) || 0;
  const healthLevel = Number(plant?.healthLevel) || 0;

  if (longestStreak >= 21 && healthLevel >= 4) return "gold";
  if (longestStreak >= 7 && healthLevel >= 3) return "silver";
  return "bronze";
}

const TROPHY_PARTICLE_COLORS = {
  bronze: ["rgba(242, 196, 145, 0.95)", "rgba(255, 220, 184, 0.9)", "rgba(247, 177, 115, 0.92)"],
  silver: ["rgba(237, 242, 255, 0.96)", "rgba(213, 224, 255, 0.9)", "rgba(196, 214, 255, 0.92)"],
  gold: ["rgba(255, 249, 179, 1)", "rgba(255, 224, 120, 0.95)", "rgba(255, 238, 153, 0.96)"],
};

const TROPHY_PARTICLE_PRESETS = {
  bronze: {
    count: 3,
    xRange: [0, 78],
    yRange: [38, 76],
    travelRange: [14, 34],
    driftRange: [-12, 12],
    sizeRange: [4, 7],
    speedRange: [0.82, 1],
    durationRange: [1200, 1900],
    waitRange: [30, 180],
    opacityCurve: [0.05, 0.95, 0.7, 0],
    scaleCurve: [0.45, 1.05, 0.65],
    glowChance: 0,
    orbitCount: 0,
    orbitRadiusRange: [12, 18],
    orbitSizeRange: [1.8, 2.8],
    orbitDurationRange: [2200, 3000],
  },
  silver: {
    count: 5,
    xRange: [-2, 80],
    yRange: [36, 80],
    travelRange: [18, 42],
    driftRange: [-16, 16],
    sizeRange: [4.5, 8],
    speedRange: [0.9, 1.08],
    durationRange: [980, 1650],
    waitRange: [20, 120],
    opacityCurve: [0.06, 1, 0.78, 0],
    scaleCurve: [0.5, 1.15, 0.72],
    glowChance: 0.35,
    orbitCount: 3,
    orbitRadiusRange: [14, 22],
    orbitSizeRange: [2, 3.2],
    orbitDurationRange: [1800, 2600],
  },
  gold: {
    count: 7,
    xRange: [-4, 82],
    yRange: [34, 82],
    travelRange: [22, 52],
    driftRange: [-22, 22],
    sizeRange: [5, 9.5],
    speedRange: [0.95, 1.18],
    durationRange: [820, 1380],
    waitRange: [10, 80],
    opacityCurve: [0.08, 1, 0.84, 0],
    scaleCurve: [0.55, 1.25, 0.78],
    glowChance: 0.62,
    orbitCount: 5,
    orbitRadiusRange: [16, 28],
    orbitSizeRange: [2.2, 3.8],
    orbitDurationRange: [1300, 2200],
  },
};

const randomBetween = (min, max) => min + Math.random() * (max - min);
const randomInt = (min, max) => Math.floor(randomBetween(min, max + 1));

const buildRandomParticle = (rating, idx) => {
  const preset = TROPHY_PARTICLE_PRESETS[rating] || TROPHY_PARTICLE_PRESETS.bronze;
  const colors = TROPHY_PARTICLE_COLORS[rating] || TROPHY_PARTICLE_COLORS.bronze;
  const isGlow = Math.random() < preset.glowChance;
  const size = randomBetween(preset.sizeRange[0], preset.sizeRange[1]);

  return {
    key: `${rating}-${idx}-${Date.now()}-${Math.round(Math.random() * 100000)}`,
    x: randomBetween(preset.xRange[0], preset.xRange[1]),
    y: randomBetween(preset.yRange[0], preset.yRange[1]),
    travel: randomBetween(preset.travelRange[0], preset.travelRange[1]),
    drift: randomBetween(preset.driftRange[0], preset.driftRange[1]),
    size,
    speedFactor: randomBetween(preset.speedRange[0], preset.speedRange[1]),
    duration: randomInt(preset.durationRange[0], preset.durationRange[1]),
    waitMs: randomInt(preset.waitRange[0], preset.waitRange[1]),
    opacityCurve: preset.opacityCurve,
    scaleCurve: preset.scaleCurve,
    glowRadius: isGlow ? size * randomBetween(8, 14) : size * randomBetween(2, 4),
    glowOpacity: isGlow ? 1.0 : randomBetween(0.5, 0.8),
    color: colors[randomInt(0, colors.length - 1)],
  };
};

const buildOrbitParticle = (rating, idx) => {
  const preset = TROPHY_PARTICLE_PRESETS[rating] || TROPHY_PARTICLE_PRESETS.bronze;
  const colors = TROPHY_PARTICLE_COLORS[rating] || TROPHY_PARTICLE_COLORS.bronze;
  const size = randomBetween(preset.orbitSizeRange[0], preset.orbitSizeRange[1]);
  const glowBoost = rating === "gold" ? 3.5 : rating === "silver" ? 2.5 : 1.8;

  return {
    key: `orbit-${rating}-${idx}-${Date.now()}-${Math.round(Math.random() * 100000)}`,
    radius: randomBetween(preset.orbitRadiusRange[0], preset.orbitRadiusRange[1]),
    size,
    startAngle: randomBetween(-180, 180),
    direction: Math.random() < 0.5 ? 1 : -1,
    duration: randomInt(preset.orbitDurationRange[0], preset.orbitDurationRange[1]),
    color: colors[randomInt(0, colors.length - 1)],
    glowRadius: size * randomBetween(6, 12) * glowBoost,
    glowOpacity: Math.min(randomBetween(0.9, 1.0) * glowBoost, 1.0),
  };
};

const buildOrbitParticles = (rating) => {
  const preset = TROPHY_PARTICLE_PRESETS[rating] || TROPHY_PARTICLE_PRESETS.bronze;
  return Array.from({ length: preset.orbitCount || 0 }, (_, idx) => buildOrbitParticle(rating, idx));
};

const buildRandomParticles = (rating) => {
  const preset = TROPHY_PARTICLE_PRESETS[rating] || TROPHY_PARTICLE_PRESETS.bronze;
  return Array.from({ length: preset.count }, (_, idx) => buildRandomParticle(rating, idx));
};

const TrophyParticles = ({ rating }) => {
  const [particles, setParticles] = useState(() => buildRandomParticles(rating));
  const [orbitParticles, setOrbitParticles] = useState(() => buildOrbitParticles(rating));
  const progressRefs = useRef([]);
  const orbitProgressRefs = useRef([]);

  useEffect(() => {
    const nextParticles = buildRandomParticles(rating);
    const nextOrbitParticles = buildOrbitParticles(rating);
    setParticles(nextParticles);
    setOrbitParticles(nextOrbitParticles);
    progressRefs.current = Array.from({ length: nextParticles.length }, (_, idx) => progressRefs.current[idx] || new Animated.Value(Math.random()));
    orbitProgressRefs.current = Array.from({ length: nextOrbitParticles.length }, (_, idx) => orbitProgressRefs.current[idx] || new Animated.Value(Math.random()));
  }, [rating]);

  useEffect(() => {
    let isActive = true;
    const timers = [];
    const animateParticle = (idx) => {
      if (!isActive || !progressRefs.current[idx]) return;
      const progress = progressRefs.current[idx];
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: particles[idx]?.duration || randomInt(1200, 1900),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!isActive || !finished) return;
        setParticles((prev) => {
          if (!prev[idx]) return prev;
          const next = [...prev];
          next[idx] = buildRandomParticle(rating, idx);
          return next;
        });
        const timer = setTimeout(() => animateParticle(idx), particles[idx]?.waitMs || randomInt(30, 180));
        timers.push(timer);
      });
    };
    progressRefs.current.forEach((_, idx) => {
      const timer = setTimeout(() => animateParticle(idx), randomInt(0, 500));
      timers.push(timer);
    });
    return () => {
      isActive = false;
      timers.forEach(clearTimeout);
      progressRefs.current.forEach((value) => value?.stopAnimation());
    };
  }, [particles, rating]);

  useEffect(() => {
    let isActive = true;
    const timers = [];
    const animateOrbitParticle = (idx) => {
      if (!isActive || !orbitProgressRefs.current[idx]) return;
      const progress = orbitProgressRefs.current[idx];
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: orbitParticles[idx]?.duration || randomInt(1600, 2400),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!isActive || !finished) return;
        setOrbitParticles((prev) => {
          if (!prev[idx]) return prev;
          const next = [...prev];
          next[idx] = buildOrbitParticle(rating, idx);
          return next;
        });
        const timer = setTimeout(() => animateOrbitParticle(idx), randomInt(10, 80));
        timers.push(timer);
      });
    };
    orbitProgressRefs.current.forEach((_, idx) => {
      const timer = setTimeout(() => animateOrbitParticle(idx), randomInt(0, 400));
      timers.push(timer);
    });
    return () => {
      isActive = false;
      timers.forEach(clearTimeout);
      orbitProgressRefs.current.forEach((value) => value?.stopAnimation());
    };
  }, [orbitParticles, rating]);

  return (
    <View pointerEvents="none" style={styles.particleLayer}>
      {orbitParticles.map((particle, idx) => {
        const progress = orbitProgressRefs.current[idx] || new Animated.Value(0);
        const spin = progress.interpolate({
          inputRange: [0, 1],
          outputRange: particle.direction === -1 ? ["360deg", "0deg"] : ["0deg", "360deg"],
        });
        const opacity = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.2, 0.95, 0.2] });
        const scale = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.85, 1.2, 0.85] });

        return (
          <View key={particle.key} style={[styles.orbitCenter, { transform: [{ rotate: `${particle.startAngle}deg` }] }]}>
            <Animated.View style={{ transform: [{ rotate: spin }, { translateX: particle.radius }, { scale }] }}>
              <Animated.View
                style={[
                  styles.orbitDot,
                  {
                    width: particle.size,
                    height: particle.size,
                    borderRadius: particle.size / 2,
                    backgroundColor: particle.color,
                    shadowColor: particle.color,
                    shadowOpacity: particle.glowOpacity,
                    shadowRadius: particle.glowRadius,
                    shadowOffset: { width: 0, height: 0 },
                    opacity,
                  },
                ]}
              />
            </Animated.View>
          </View>
        );
      })}

      {particles.map((particle, idx) => {
        const progress = progressRefs.current[idx] || new Animated.Value(0);
        const shiftedProgress = progress.interpolate({ inputRange: [0, 1], outputRange: [0, particle.speedFactor] });
        const opacity = shiftedProgress.interpolate({ inputRange: [0, 0.2, 0.7, 1], outputRange: particle.opacityCurve || [0.05, 0.95, 0.7, 0] });
        const scale = shiftedProgress.interpolate({ inputRange: [0, 0.4, 1], outputRange: particle.scaleCurve || [0.45, 1.05, 0.65] });
        const translateY = shiftedProgress.interpolate({ inputRange: [0, 1], outputRange: [0, -particle.travel] });
        const translateX = shiftedProgress.interpolate({ inputRange: [0, 1], outputRange: [0, particle.drift] });
        return (
          <Animated.View
            key={particle.key}
            style={[
              styles.particleDot,
              {
                left: particle.x,
                bottom: particle.y,
                width: particle.size,
                height: particle.size,
                borderRadius: particle.size / 2,
                backgroundColor: particle.color,
                shadowColor: particle.color,
                shadowOpacity: particle.glowOpacity,
                shadowRadius: particle.glowRadius,
                shadowOffset: { width: 0, height: 0 },
                opacity,
                transform: [{ translateX }, { translateY }, { scale }],
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const AMBIENT_COUNT = 20;
const buildAmbientParticle = (idx) => ({
  key: `ambient-${idx}-${Date.now()}`,
  x: Math.random() * 90,
  startY: 15 + Math.random() * 70,
  size: 5 + Math.random() * 4,
  duration: 4000 + Math.random() * 4000,
  drift: (Math.random() - 0.5) * 40,
  travel: 40 + Math.random() * 60,
  delay: Math.random() * 3000,
});

const GardenAmbientParticles = () => {
  const particles = useRef(Array.from({ length: AMBIENT_COUNT }, (_, i) => buildAmbientParticle(i))).current;
  const anims = useRef(particles.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    let active = true;
    const loops = anims.map((anim, i) => {
      const loop = Animated.loop(
        Animated.timing(anim, {
          toValue: 1,
          duration: particles[i].duration,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      const timer = setTimeout(() => {
        if (active) loop.start();
      }, particles[i].delay);
      return { loop, timer };
    });
    return () => {
      active = false;
      loops.forEach(({ loop, timer }) => {
        clearTimeout(timer);
        loop.stop();
      });
    };
  }, [anims, particles]);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 9998, elevation: 9998 }]}>
      {particles.map((particle, idx) => {
        const opacity = anims[idx].interpolate({ inputRange: [0, 0.15, 0.75, 1], outputRange: [0, 0.85, 0.65, 0] });
        const translateY = anims[idx].interpolate({ inputRange: [0, 1], outputRange: [0, -particle.travel] });
        const translateX = anims[idx].interpolate({ inputRange: [0, 1], outputRange: [0, particle.drift] });
        return (
          <Animated.View
            key={particle.key}
            style={{
              position: "absolute",
              left: `${particle.x}%`,
              top: `${particle.startY}%`,
              width: particle.size,
              height: particle.size,
              borderRadius: particle.size / 2,
              backgroundColor: "rgba(255, 255, 255, 0.72)",
              opacity,
              transform: [{ translateX }, { translateY }],
            }}
          />
        );
      })}
    </View>
  );
};

const PlantVisual = ({ plant }) => {
  const total = Number(plant.totalCompletions) || 0;
  const rating = getStoragePlantRating(plant);
  const swayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (rating) {
      swayAnim.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(swayAnim, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(swayAnim, { toValue: -1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(swayAnim, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const timer = setTimeout(() => loop.start(), Math.random() * 1500);
    return () => {
      clearTimeout(timer);
      loop.stop();
      swayAnim.setValue(0);
    };
  }, [rating, swayAnim]);

  let stage = "stage1";
  if (total > 30) stage = "stage4";
  else if (total > 15) stage = "stage3";
  else if (total > 5) stage = "stage2";

  const status = plant.healthLevel === 1 ? "dead" : "alive";
  const species = plant.plantSpecies || (plant.type !== "completion" && plant.type !== "quantity" ? plant.type : "fern");
  const asset = PLANT_ASSETS[species]?.[stage]?.[status] || PLANT_ASSETS.fern.stage1.alive;
  const trophyPlantAsset = rating && status === "alive" && species === "fern" ? TROPHY_FERN_IMAGES[rating]?.[stage] : null;
  const showTrophyParticles = Boolean(rating && status === "alive");
  const plantSource = trophyPlantAsset || asset;
  const potSource = rating ? (TROPHY_POT_IMAGES[rating] || POT_IMAGE) : POT_IMAGE;

  const getPotIcon = () => {
    if (plant.icon) return plant.icon;
    if (plant.goalIcon) return plant.goalIcon;
    return plant.type === "coding" ? "code-slash" : "leaf";
  };

  return (
    <View style={styles.plantAssemblyWrapper}>
      <View style={styles.plantAssembly}>
        <ImageBackground source={potSource} style={styles.potBackground} imageStyle={styles.potImageTexture} resizeMode="contain">
          <Animated.Image
            source={plantSource}
            style={[
              styles.plantImage,
              !rating && {
                transform: [
                  { translateY: 42.5 },
                  { rotate: swayAnim.interpolate({ inputRange: [-1, 1], outputRange: ["-4deg", "6deg"] }) },
                  { translateY: -42.5 },
                ],
              },
            ]}
            resizeMode="contain"
          />
          {showTrophyParticles && <TrophyParticles rating={rating} />}
          <View style={styles.potLabel}>
            <Ionicons name={getPotIcon()} size={18} color="#fff" />
          </View>
        </ImageBackground>
      </View>
      {(plant.title || plant.name) ? (
        <Text style={styles.plantNameLabel} numberOfLines={1} ellipsizeMode="tail">
          {plant.title || plant.name}
        </Text>
      ) : null}
    </View>
  );
};

const StaticPlant = ({ plant }) => (
  <View style={styles.plantContainer}>
    <PlantVisual plant={plant} />
  </View>
);

const SHELF_CONFIG = {
  topShelf: { side: "left", width: "65%", offsetTop: 0, slots: 3 },
  middleShelf: { side: "right", width: "65%", offsetTop: -50, slots: 3 },
  bottomShelf: { side: "full", width: "100%", offsetTop: 130, slots: 4 },
};

export default function UserGardenScreen({ route, navigation }) {
  const { userId, username } = route.params || {};
  const [allPlants, setAllPlants] = useState([]);
  const [pages, setPages] = useState([]);
  const [currentPageId, setCurrentPageId] = useState("default");
  const [loading, setLoading] = useState(true);
  const { width, height } = useWindowDimensions();
  const flatListRef = useRef(null);
  const pageScrollX = useRef(new Animated.Value(0)).current;
  const [drawerShouldShow, setDrawerShouldShow] = useState(true);
  const drawerShouldShowRef = useRef(true);

  useEffect(() => {
    if (!userId) return;
    const unsubLayout = onSnapshot(collection(db, "users", userId, "gardenLayout"), (layoutSnap) => {
      const layoutMap = {};
      layoutSnap.forEach((layoutDoc) => {
        const pos = layoutDoc.data().shelfPosition;
        layoutMap[layoutDoc.id] = pos ? { ...pos, pageId: pos.pageId || "default" } : null;
      });

      const unsubGoals = onSnapshot(collection(db, "users", userId, "goals"), (goalsSnap) => {
        const merged = goalsSnap.docs.map((goalDoc) => ({
          id: goalDoc.id,
          ...goalDoc.data(),
          shelfPosition: layoutMap[goalDoc.id] || null,
        }));
        setAllPlants(merged);
        setLoading(false);
      });

      return () => unsubGoals();
    });

    return () => unsubLayout();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const unsubPages = onSnapshot(collection(db, "users", userId, "gardenPages"), (snap) => {
      const docs = snap.docs.map((pageDoc) => ({ id: pageDoc.id, ...pageDoc.data() }));
      const sorted = docs.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      const gardenPages = sorted.length ? sorted : [{ id: "default", title: "Page 1" }];
      setPages([{ id: STORAGE_PAGE_ID, title: "Storage" }, ...gardenPages]);
      setCurrentPageId((prev) => (prev && (prev === STORAGE_PAGE_ID || gardenPages.some((page) => page.id === prev)) ? prev : "default"));
    });
    return () => unsubPages();
  }, [userId]);

  useEffect(() => {
    if (!pages.length) return;
    const index = pages.findIndex((page) => page.id === currentPageId);
    if (index < 0 || !flatListRef.current) return;
    setTimeout(() => {
      flatListRef.current?.scrollToIndex?.({ index, animated: false });
    }, 0);
  }, [pages, currentPageId]);

  const onPageScrollEnd = (e) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const idx = Math.round(offsetX / width);
    if (idx >= 0 && idx < pages.length) {
      setCurrentPageId(pages[idx].id);
    }
  };

  const renderStorageShelf = (pageId, shelfIdx, plantsOnPage) => {
    const shelfName = `storageShelf_${shelfIdx}`;
    return (
      <View key={`${pageId}_${shelfName}`} style={[styles.shelfWrapper, styles.storageShelfWrapper]}>
        <LinearGradient
          colors={["#FF6A28", "#E0502A", "#B43A2A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.25 }}
          style={[styles.shelfLedge, styles.bottomShelfLedge, styles.storageShelfLedge]}
        >
          <View style={[styles.shelfHighlightLeft, styles.bottomShelfHighlightLeft]} />
          <View style={[styles.shelfHighlightRight, styles.bottomShelfHighlightRight]} />
          <View style={[styles.shelfCornerShade, styles.bottomShelfCornerShade]} />
          <View style={[styles.shelfBand, styles.bottomShelfBand]}>
            <View style={[styles.shelfBandDivider, styles.bottomShelfBandDivider]} />
            <LinearGradient colors={["#8A2D35", "#65243A"]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={[styles.shelfBandUpper, styles.bottomShelfBandUpper]} />
            <LinearGradient colors={["#592344", "#3D1736"]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={[styles.shelfBandLower, styles.bottomShelfBandLower]} />
          </View>
        </LinearGradient>

        <View style={styles.slotsRow}>
          {Array.from({ length: 4 }).map((_, idx) => {
            const occupant = plantsOnPage.find((plant) => plant.shelfPosition?.shelfName === shelfName && plant.shelfPosition?.slotIndex === idx);
            return <View key={`${pageId}_${shelfName}_${idx}`} style={styles.slot}>{occupant ? <StaticPlant plant={occupant} /> : null}</View>;
          })}
        </View>
      </View>
    );
  };

  const renderShelf = (pageId, shelfName, plantsOnPage) => {
    const config = SHELF_CONFIG[shelfName];
    const isBottomShelf = shelfName === "bottomShelf";

    const shelfDecor = (
      <>
        <View style={[styles.shelfHighlightLeft, isBottomShelf && styles.bottomShelfHighlightLeft]} />
        <View style={[styles.shelfHighlightRight, isBottomShelf && styles.bottomShelfHighlightRight]} />
        <View style={[styles.shelfCornerShade, isBottomShelf && styles.bottomShelfCornerShade]} />
        <View style={[styles.shelfBand, isBottomShelf && styles.bottomShelfBand]}>
          <View style={[styles.shelfBandDivider, isBottomShelf && styles.bottomShelfBandDivider]} />
          {isBottomShelf ? (
            <LinearGradient colors={["#8A2D35", "#65243A"]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={[styles.shelfBandUpper, styles.bottomShelfBandUpper]} />
          ) : (
            <View style={styles.shelfBandUpper} />
          )}
          {isBottomShelf ? (
            <LinearGradient colors={["#592344", "#3D1736"]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={[styles.shelfBandLower, styles.bottomShelfBandLower]} />
          ) : (
            <View style={styles.shelfBandLower} />
          )}
        </View>
      </>
    );

    return (
      <View key={`${pageId}_${shelfName}`} style={[styles.shelfWrapper, { width: config.width, alignSelf: config.side === "left" ? "flex-start" : config.side === "right" ? "flex-end" : "center", marginTop: config.offsetTop }]}>
        {isBottomShelf ? (
          <LinearGradient colors={["#FF6A28", "#E0502A", "#B43A2A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.25 }} style={[styles.shelfLedge, styles.bottomShelfLedge]}>
            {shelfDecor}
          </LinearGradient>
        ) : (
          <View style={styles.shelfShadow}>
            <View style={styles.shelfLedge}>{shelfDecor}</View>
          </View>
        )}
        <View style={styles.slotsRow}>
          {Array.from({ length: config.slots }).map((_, idx) => {
            const occupant = plantsOnPage.find((plant) => plant.shelfPosition?.shelfName === shelfName && plant.shelfPosition?.slotIndex === idx);
            return <View key={`${pageId}_${shelfName}_${idx}`} style={styles.slot}>{occupant ? <StaticPlant plant={occupant} /> : null}</View>;
          })}
        </View>
      </View>
    );
  };

  const renderGardenPage = (page) => {
    if (page.id === STORAGE_PAGE_ID) {
      const plantsOnPage = allPlants.filter((plant) => plant.shelfPosition?.pageId === STORAGE_PAGE_ID);
      const shelfCount = Math.max(1, Math.ceil(plantsOnPage.length / 4) + 1);
      return (
        <View style={[styles.storagePage, { width, height }]}>
          <View style={styles.storageHeader}>
            <Ionicons name="trophy" size={20} color="#FFD700" style={styles.storageHeaderIcon} />
            <Text style={styles.storageHeaderTitle}>Trophy Collection</Text>
            <Ionicons name="trophy" size={20} color="#FFD700" style={styles.storageHeaderIcon} />
          </View>
          <ScrollView style={styles.storageScroll} contentContainerStyle={styles.storageScrollContent} showsVerticalScrollIndicator={false}>
            {Array.from({ length: shelfCount }).map((_, idx) => renderStorageShelf(STORAGE_PAGE_ID, idx, plantsOnPage))}
          </ScrollView>
        </View>
      );
    }

    const plantsOnPage = allPlants.filter((plant) => plant.shelfPosition?.pageId === page.id);
    return (
      <View style={{ width, height, overflow: "hidden" }}>
        <ImageBackground source={FAR_BG} style={[styles.farBackground, { width, height }]} imageStyle={styles.farImageStyle} resizeMode="contain">
          <ImageBackground source={GARDEN_BG} style={[styles.gardenBackground, { width, height }]} imageStyle={styles.gardenImageStyle} resizeMode="cover">
            <View pointerEvents="none" style={styles.pageDrawerUnderlay}>
              <View style={styles.pageDrawerUnderlayTopBandPrimary} />
              <View style={styles.pageDrawerUnderlayTopBandSecondary} />
            </View>
            <View style={styles.gardenMain}>
              {["topShelf", "middleShelf", "bottomShelf"].map((shelfName) => renderShelf(page.id, shelfName, plantsOnPage))}
            </View>
            <GardenAmbientParticles />
          </ImageBackground>
        </ImageBackground>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#2D5A27" />
      </View>
    );
  }

  const hasPlacedPlants = allPlants.some((plant) => Boolean(plant.shelfPosition));

  if (allPlants.length === 0 || !hasPlacedPlants) {
    return (
      <View style={styles.container}>
        <View style={styles.readOnlyHeader}>
          <TouchableOpacity style={styles.readOnlyBackBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.readOnlyHeaderTitle} numberOfLines={1}>{username || "User"}'s Garden</Text>
        </View>

        <View style={styles.emptyGardenState}>
          <Ionicons name="leaf-outline" size={42} color="#A9B388" />
          <Text style={styles.emptyGardenTitle}>Garden is empty</Text>
          <Text style={styles.emptyGardenText}>This user has not placed any plants in their garden yet.</Text>
        </View>
      </View>
    );
  }

  const drawerPlants = allPlants.filter((plant) => !plant.shelfPosition);
  const pageIndex = Math.max(0, pages.findIndex((page) => page.id === currentPageId));

  return (
    <View style={styles.container}>
      <View style={styles.readOnlyHeader}>
        <TouchableOpacity style={styles.readOnlyBackBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.readOnlyHeaderTitle} numberOfLines={1}>{username || "User"}'s Garden</Text>
      </View>

      <Animated.FlatList
        ref={flatListRef}
        data={pages}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        alwaysBounceHorizontal={false}
        overScrollMode="never"
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: pageScrollX } } }],
          {
            useNativeDriver: false,
            listener: (e) => {
              const offsetX = e.nativeEvent.contentOffset.x;
              const nextShow = offsetX > width * 0.9;
              if (nextShow !== drawerShouldShowRef.current) {
                drawerShouldShowRef.current = nextShow;
                setDrawerShouldShow(nextShow);
              }
            },
          }
        )}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onPageScrollEnd}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        initialScrollIndex={pageIndex}
        renderItem={({ item }) => <View style={{ width, flex: 1 }}>{renderGardenPage(item)}</View>}
        style={[styles.pageList, { width, height }]}
      />

      <View style={styles.pageDotsContainer}>
        <View style={styles.pageDots}>
          {pages.map((page, index) => {
            const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
            const isTrophyDot = page.id === STORAGE_PAGE_ID;
            const animatedWidth = pageScrollX.interpolate({ inputRange, outputRange: [8, 20, 8], extrapolate: "clamp" });
            const animatedOpacity = pageScrollX.interpolate({ inputRange, outputRange: [0.45, 1, 0.45], extrapolate: "clamp" });
            const animatedScale = pageScrollX.interpolate({ inputRange, outputRange: [1, 1.15, 1], extrapolate: "clamp" });
            const animatedBackgroundColor = pageScrollX.interpolate({
              inputRange,
              outputRange: isTrophyDot
                ? ["rgba(255, 196, 64, 0.45)", "#FFD54A", "rgba(255, 196, 64, 0.45)"]
                : ["rgb(103, 103, 103)", "#ffffff", "rgb(103, 103, 103)"],
              extrapolate: "clamp",
            });

            return (
              <Animated.View
                key={page.id}
                style={[
                  styles.dot,
                  { width: animatedWidth, backgroundColor: animatedBackgroundColor, opacity: animatedOpacity, transform: [{ scale: animatedScale }] },
                ]}
              />
            );
          })}
        </View>
      </View>

      <View pointerEvents={drawerShouldShow ? "auto" : "none"} style={[styles.drawer, !drawerShouldShow && styles.drawerHidden]}>
        <View style={styles.drawerTopBandPrimary} />
        <View style={styles.drawerTopBandSecondary} />
        <ScrollView horizontal directionalLockEnabled showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false} bounces={false} alwaysBounceVertical={false} contentContainerStyle={[styles.drawerList, { flexDirection: "row", alignItems: "center" }]}>
          {drawerPlants.map((plant) => (
            <View key={plant.id} style={{ marginHorizontal: 10 }}>
              <StaticPlant plant={plant} />
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fdfbf700" },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  readOnlyHeader: {
    position: "absolute",
    top: 48,
    left: 14,
    right: 14,
    zIndex: 40,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(20, 25, 45, 0.82)",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  readOnlyBackBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    marginRight: 10,
  },
  readOnlyHeaderTitle: { flex: 1, color: "#fff", fontSize: 16, fontWeight: "800" },
  emptyGardenState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyGardenTitle: {
    marginTop: 14,
    color: "#2D5A27",
    fontSize: 22,
    fontWeight: "800",
  },
  emptyGardenText: {
    marginTop: 8,
    color: "#6E6E6E",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  pageDotsContainer: { position: "absolute", bottom: 10, left: 0, right: 0, alignItems: "center", zIndex: 999999 },
  pageDots: { flexDirection: "row", justifyContent: "center", alignItems: "center", paddingVertical: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgb(103, 103, 103)", marginHorizontal: 4 },
  pageList: { flex: 1 },
  storagePage: { flex: 1, backgroundColor: "#242347" },
  storageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 54,
    paddingBottom: 14,
    paddingHorizontal: 20,
    backgroundColor: "#1a1836",
    borderBottomWidth: 1,
    borderBottomColor: "#2e2b5a",
  },
  storageHeaderTitle: {
    color: "#FFD700",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginHorizontal: 10,
    textShadowColor: "rgba(255, 200, 0, 0.45)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  storageHeaderIcon: { opacity: 0.9 },
  storageScroll: { flex: 1 },
  storageScrollContent: { paddingTop: 20, paddingBottom: 220, gap: 18 },
  gardenMain: { flex: 1, paddingBottom: 160, paddingTop: 40, justifyContent: "space-around" },
  shelfWrapper: { height: 132, justifyContent: "flex-end", marginBottom: 20, marginHorizontal: -4, overflow: "visible" },
  storageShelfWrapper: { width: "100%", alignSelf: "center", marginTop: 0, marginBottom: 0, overflow: "visible" },
  shelfShadow: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: "100%",
    height: 60,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 10, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 0,
    elevation: 8,
  },
  shelfLedge: { position: "absolute", bottom: 0, left: 0, width: "100%", height: 60, backgroundColor: "#FA6424", borderRadius: 16, overflow: "hidden" },
  shelfHighlightLeft: { position: "absolute", top: 12, left: "8%", width: "46%", height: 14, borderRadius: 12, backgroundColor: "#FF9F45", opacity: 0.95 },
  shelfHighlightRight: { position: "absolute", top: 18, right: "6%", width: "38%", height: 16, borderRadius: 14, backgroundColor: "#FF9A3E", opacity: 0.94 },
  shelfCornerShade: { position: "absolute", top: 6, right: "3%", width: "20%", height: 6, borderRadius: 6, backgroundColor: "#ff8a37", opacity: 0.65 },
  shelfBand: { position: "absolute", left: 0, right: 0, bottom: 0, height: 22 },
  shelfBandDivider: { position: "absolute", top: 0, left: 0, right: 0, height: 0, backgroundColor: "#A63A3A", zIndex: 2 },
  shelfBandUpper: { position: "absolute", top: 1, left: 0, right: 0, height: 18, backgroundColor: "#a84615" },
  shelfBandLower: { position: "absolute", left: 0, right: 0, bottom: 0, height: 12, backgroundColor: "#611c45" },
  bottomShelfLedge: { height: 65, borderRadius: 0 },
  bottomShelfHighlightLeft: { top: 12, left: "8%", width: "48%", height: 11, borderRadius: 8, backgroundColor: "#FF9F4A", opacity: 0.92 },
  bottomShelfHighlightRight: { top: 18, right: "-1%", width: "39%", height: 18, borderRadius: 12, backgroundColor: "#FF9742", opacity: 0.9 },
  bottomShelfCornerShade: { top: 6, right: "4%", width: "38%", height: 5, borderRadius: 4, backgroundColor: "#f44d2c", opacity: 0.5 },
  bottomShelfBand: { height: 22 },
  bottomShelfBandDivider: { height: 1, backgroundColor: "#9A3438" },
  bottomShelfBandUpper: { top: 1, height: 16 },
  bottomShelfBandLower: { height: 11 },
  storageShelfLedge: { borderRadius: 12, overflow: "hidden" },
  slotsRow: { height: 85, flexDirection: "row", justifyContent: "space-around", width: "100%", zIndex: 5 },
  slot: { width: 80, height: 80, justifyContent: "flex-end", alignItems: "center", borderRadius: 12 },
  drawer: { position: "absolute", bottom: -30, height: 170, width: "100%", backgroundColor: "#242347", zIndex: 100, overflow: "hidden" },
  drawerHidden: { opacity: 0 },
  pageDrawerUnderlay: { position: "absolute", bottom: 33, left: 0, right: 0, height: 170, backgroundColor: "#242347", zIndex: 1, overflow: "hidden" },
  pageDrawerUnderlayTopBandPrimary: { position: "absolute", top: 0, left: 0, right: 0, height: 12, backgroundColor: "#111338" },
  pageDrawerUnderlayTopBandSecondary: { position: "absolute", top: 12, left: 0, right: 0, height: 6, backgroundColor: "#1A1D45" },
  drawerTopBandPrimary: { position: "absolute", top: 0, left: 0, right: 0, height: 12, backgroundColor: "#111338" },
  drawerTopBandSecondary: { position: "absolute", top: 12, left: 0, right: 0, height: 6, backgroundColor: "#1A1D45" },
  drawerList: { paddingHorizontal: 0, alignItems: "center", minWidth: "100%", flexGrow: 1, justifyContent: "center", paddingTop: 14 },
  plantContainer: { width: 100, height: 125, alignItems: 'center', justifyContent: 'flex-end', bottom: -15 },
  plantAssemblyWrapper: { alignItems: 'center', justifyContent: 'flex-end', width: '100%', height: '10', bottom: -10 },
  plantAssembly: { alignItems: 'center', justifyContent: 'flex-end', width: '100%', flex: 1 },
  plantNameLabel: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
    textAlign: "center",
    width: 90,
    marginTop: 0,
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    letterSpacing: 0.2,
    bottom: 30,
  },
  potBackground: { width: 80, height: 80, alignItems: "center", justifyContent: "flex-end", position: "relative", bottom: 10 },
  particleLayer: { position: "absolute", left: -8, right: -8, bottom: 30, height: 80, zIndex: 3 },
  particleDot: { position: "absolute", width: 6, height: 6, borderRadius: 3 },
  orbitCenter: { position: "absolute", left: 32, bottom: 36, width: 16, height: 16, alignItems: "center", justifyContent: "center" },
  orbitDot: { position: "absolute" },
  potImageTexture: { width: "100%", height: "70%", bottom: 0, position: "absolute" },
  plantImage: { width: 65, height: 85, position: "absolute", bottom: 68, zIndex: 1 },
  potLabel: { position: "absolute", bottom: 30, minWidth: 24, minHeight: 24, justifyContent: "center", alignItems: "center", zIndex: 4 },
  farBackground: { flex: 1, width: "100%", backgroundColor: "#1a1a1a" },
  farImageStyle: { top: 0, left: 40, opacity: 1, height: "120%", transform: [{ scale: 1.3 }] },
  gardenBackground: { flex: 1, width: "100%", height: "100%", bottom: 0 },
  gardenImageStyle: { top: -80, transform: [{ scale: 1.1 }] },
});
