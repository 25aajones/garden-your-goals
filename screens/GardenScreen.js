import React, { useState, useCallback, useRef, useEffect, memo } from "react";
import { 
  View, Text, StyleSheet, ActivityIndicator, ScrollView, FlatList, 
  Animated, TouchableOpacity, Platform, UIManager, LayoutAnimation, PanResponder, Image, ImageBackground, useWindowDimensions, TouchableWithoutFeedback, Pressable, Alert, Easing 
} from "react-native";

// Persist some state across mounts (helps keep drawer position & current page stable)
const persistedGardenState = {
  allPlants: null,
  currentPageId: null,
  isEditing: false,
  drawerScrollOffset: 0,
};
import { collection, doc, onSnapshot, setDoc, writeBatch } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { theme } from "../theme";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { PLANT_ASSETS } from "../constants/PlantAssets";
const FAR_BG = require('../assets/far_background.png');
const GARDEN_BG = require('../assets/garden_BG.png');
const STORAGE_PAGE_ID = 'storage';
const STORAGE_SHELF_COUNT = 10;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const POT_IMAGE = require('../assets/plants/pot.png');
const TROPHY_POT_IMAGES = {
  bronze: require('../assets/plants/pot_b.png'),
  silver: require('../assets/plants/pot_s.png'),
  gold: require('../assets/plants/pot_g.png'),
};

const TROPHY_FERN_IMAGES = {
  bronze: {
    stage1: require('../assets/plants/fern_stage1_b.png'),
    stage2: require('../assets/plants/fern_stage2_b.png'),
    stage3: require('../assets/plants/fern_stage3_b.png'),
    stage4: require('../assets/plants/fern_stage4_b.png'),
  },
  silver: {
    stage1: require('../assets/plants/fern_stage1_s.png'),
    stage2: require('../assets/plants/fern_stage2_s.png'),
    stage3: require('../assets/plants/fern_stage3_s.png'),
    stage4: require('../assets/plants/fern_stage4_s.png'),
  },
  gold: {
    stage1: require('../assets/plants/fern_stage1_g.png'),
    stage2: require('../assets/plants/fern_stage2_g.png'),
    stage3: require('../assets/plants/fern_stage3_g.png'),
    stage4: require('../assets/plants/fern_stage4_g.png'),
  },
};

function getStoragePlantRating(plant) {
  if (plant?.shelfPosition?.pageId !== STORAGE_PAGE_ID) return null;

  const longestStreak = Number(plant?.longestStreak) || 0;
  const healthLevel = Number(plant?.healthLevel) || 0;

  if (longestStreak >= 21 && healthLevel >= 4) return 'gold';
  if (longestStreak >= 7 && healthLevel >= 3) return 'silver';
  return 'bronze';
}

const TROPHY_PARTICLE_COLORS = {
  bronze: ['rgba(242, 196, 145, 0.95)', 'rgba(255, 220, 184, 0.9)', 'rgba(247, 177, 115, 0.92)'],
  silver: ['rgba(237, 242, 255, 0.96)', 'rgba(213, 224, 255, 0.9)', 'rgba(196, 214, 255, 0.92)'],
  gold: ['rgba(255, 249, 179, 1)', 'rgba(255, 224, 120, 0.95)', 'rgba(255, 238, 153, 0.96)'],
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
    isGlow,
    glowRadius: isGlow ? size * randomBetween(8, 14) : size * randomBetween(2, 4),
    glowOpacity: isGlow ? 1.0 : randomBetween(0.5, 0.8),
    color: colors[randomInt(0, colors.length - 1)],
  };
};

const buildOrbitParticle = (rating, idx) => {
  const preset = TROPHY_PARTICLE_PRESETS[rating] || TROPHY_PARTICLE_PRESETS.bronze;
  const colors = TROPHY_PARTICLE_COLORS[rating] || TROPHY_PARTICLE_COLORS.bronze;
  const size = randomBetween(preset.orbitSizeRange[0], preset.orbitSizeRange[1]);
  const glowBoost = rating === 'gold' ? 3.5 : rating === 'silver' ? 2.5 : 1.8;

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
  const count = preset.count;
  return Array.from({ length: count }, (_, idx) => buildRandomParticle(rating, idx));
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

    const count = nextParticles.length;
    progressRefs.current = Array.from({ length: count }, (_, idx) => {
      const existing = progressRefs.current[idx];
      return existing || new Animated.Value(Math.random());
    });

    const orbitCount = nextOrbitParticles.length;
    orbitProgressRefs.current = Array.from({ length: orbitCount }, (_, idx) => {
      const existing = orbitProgressRefs.current[idx];
      return existing || new Animated.Value(Math.random());
    });
  }, [rating]);

  useEffect(() => {
    let isActive = true;
    const timers = [];

    const animateParticle = (idx) => {
      if (!isActive || !progressRefs.current[idx]) return;
      const progress = progressRefs.current[idx];
      progress.setValue(0);

      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: particles[idx]?.duration || randomInt(1200, 1900),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (!isActive || !finished) return;

        setParticles((prev) => {
          if (!prev[idx]) return prev;
          const next = [...prev];
          next[idx] = buildRandomParticle(rating, idx);
          return next;
        });

        progress.setValue(0);
        const waitMs = particles[idx]?.waitMs || randomInt(30, 180);
        const timer = setTimeout(() => animateParticle(idx), waitMs);
        timers.push(timer);
      });
    };

    progressRefs.current.forEach((_, idx) => {
      const startDelay = randomInt(0, 500);
      const timer = setTimeout(() => animateParticle(idx), startDelay);
      timers.push(timer);
    });

    return () => {
      isActive = false;
      timers.forEach(clearTimeout);
      progressRefs.current.forEach((value) => value?.stopAnimation());
    };
  }, [rating]);

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

        const waitMs = randomInt(10, 80);
        const timer = setTimeout(() => animateOrbitParticle(idx), waitMs);
        timers.push(timer);
      });
    };

    orbitProgressRefs.current.forEach((_, idx) => {
      const startDelay = randomInt(0, 400);
      const timer = setTimeout(() => animateOrbitParticle(idx), startDelay);
      timers.push(timer);
    });

    return () => {
      isActive = false;
      timers.forEach(clearTimeout);
      orbitProgressRefs.current.forEach((value) => value?.stopAnimation());
    };
  }, [rating]);

  return (
    <View pointerEvents="none" style={styles.particleLayer}>
      {orbitParticles.map((particle, idx) => {
        const progress = orbitProgressRefs.current[idx] || new Animated.Value(0);
        const spin = progress.interpolate({
          inputRange: [0, 1],
          outputRange: particle.direction === -1 ? ['360deg', '0deg'] : ['0deg', '360deg'],
          extrapolate: 'clamp',
        });
        const opacity = progress.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0.2, 0.95, 0.2],
          extrapolate: 'clamp',
        });
        const scale = progress.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0.85, 1.2, 0.85],
          extrapolate: 'clamp',
        });

        return (
          <View
            key={particle.key || `orbit-${rating}-${idx}`}
            style={[
              styles.orbitCenter,
              {
                transform: [{ rotate: `${particle.startAngle}deg` }],
              },
            ]}
          >
            <Animated.View
              style={{
                transform: [{ rotate: spin }, { translateX: particle.radius }, { scale }],
              }}
            >
              <Animated.View
                style={[
                  styles.orbitDot,
                  {
                    width: particle.size,
                    height: particle.size,
                    borderRadius: particle.size / 2,
                    backgroundColor: particle.color,
                    shadowColor: particle.color,
                    shadowOpacity: particle.glowOpacity || 0,
                    shadowRadius: particle.glowRadius || 0,
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
        const shiftedProgress = progress.interpolate({ inputRange: [0, 1], outputRange: [0, particle.speedFactor], extrapolate: 'clamp' });
        const opacity = shiftedProgress.interpolate({
          inputRange: [0, 0.2, 0.7, 1],
          outputRange: particle.opacityCurve || [0.05, 0.95, 0.7, 0],
          extrapolate: 'clamp',
        });
        const scale = shiftedProgress.interpolate({
          inputRange: [0, 0.4, 1],
          outputRange: particle.scaleCurve || [0.45, 1.05, 0.65],
          extrapolate: 'clamp',
        });
        const translateY = shiftedProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -particle.travel],
          extrapolate: 'clamp',
        });
        const translateX = shiftedProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, particle.drift],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View
            key={particle.key || `${rating}-particle-${idx}`}
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
                shadowOpacity: particle.glowOpacity || 0,
                shadowRadius: particle.glowRadius || 0,
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

// --- GARDEN AMBIENT PARTICLES ---
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
      const t = setTimeout(() => { if (active) loop.start(); }, particles[i].delay);
      return { loop, t };
    });
    return () => {
      active = false;
      loops.forEach(({ loop, t }) => { clearTimeout(t); loop.stop(); });
    };
  }, []);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 9998, elevation: 9998 }]}>
      {particles.map((p, i) => {
        const opacity = anims[i].interpolate({ inputRange: [0, 0.15, 0.75, 1], outputRange: [0, 0.85, 0.65, 0] });
        const translateY = anims[i].interpolate({ inputRange: [0, 1], outputRange: [0, -p.travel] });
        const translateX = anims[i].interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] });
        return (
          <Animated.View
            key={p.key}
            style={{
              position: 'absolute',
              left: `${p.x}%`,
              top: `${p.startY}%`,
              width: p.size,
              height: p.size,
              borderRadius: p.size / 2,
              backgroundColor: 'rgba(255, 255, 255, 0.72)',
              shadowColor: '#ffffff00',
              shadowOpacity: 0.9,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 0 },
              opacity,
              transform: [{ translateX }, { translateY }],
            }}
          />
        );
      })}
    </View>
  );
};

// --- 1. PLANT VISUAL COMPONENT ---
const PlantVisual = ({ plant, isDraggingHighlight }) => {
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
        Animated.timing(swayAnim, { toValue: 1,  duration: 600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(swayAnim, { toValue: -1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(swayAnim, { toValue: 0,  duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const timer = setTimeout(() => loop.start(), Math.random() * 1500);
    return () => { clearTimeout(timer); loop.stop(); swayAnim.setValue(0); };
  }, [rating]);
  
  let stage = 'stage1';
  if (total > 30) stage = 'stage4';
  else if (total > 15) stage = 'stage3';
  else if (total > 5) stage = 'stage2';

  const status = (plant.healthLevel === 1) ? 'dead' : 'alive';
  const species = plant.plantSpecies || (plant.type !== "completion" && plant.type !== "quantity" ? plant.type : "fern");
  const asset = PLANT_ASSETS[species]?.[stage]?.[status] || PLANT_ASSETS['fern']['stage1']['alive'];
  const trophyPlantAsset = rating && status === 'alive' && species === 'fern'
    ? TROPHY_FERN_IMAGES[rating]?.[stage]
    : null;
  const showTrophyParticles = Boolean(rating && status === 'alive');
  const plantSource = trophyPlantAsset || asset;
  const potSource = rating ? (TROPHY_POT_IMAGES[rating] || POT_IMAGE) : POT_IMAGE;

  const getPotIcon = () => {
    if (plant.icon) return plant.icon;
    if (plant.goalIcon) return plant.goalIcon;
    return plant.type === 'coding' ? 'code-slash' : 'leaf';
  };

  return (
    <View style={styles.plantAssemblyWrapper}>
      <View style={styles.plantAssembly}>
        <ImageBackground source={potSource} style={styles.potBackground} imageStyle={styles.potImageTexture} resizeMode="contain">
          <Animated.Image
            source={plantSource}
            style={[
              styles.plantImage,
              isDraggingHighlight && styles.draggingShadow,
              !rating && { transform: [
                { translateY: 42.5 },
                { rotate: swayAnim.interpolate({ inputRange: [-1, 1], outputRange: ['-4deg', '6deg'] }) },
                { translateY: -42.5 },
              ] },
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

// --- 2. DRAGGABLE WRAPPER ---
const DraggablePlant = memo(({ plant, isEditing, wiggleAnim, onLongPress, onDragStart, onDragEnd, onDelete, globalPan, globalDragRef, disabled = false }) => {
  const [isHidden, setIsHidden] = useState(false);
  const latestProps = useRef({ plant, onDragStart, onDragEnd, onDelete, isEditing });
  latestProps.current = { plant, onDragStart, onDragEnd, onDelete, isEditing };

  const longPressTriggeredRef = useRef(false);
  const longPressTimeoutRef = useRef(null);
  const dragStartedRef = useRef(false);
  const dragFinalizedRef = useRef(false);
  const lastTouchRef = useRef({ x: 0, y: 0, lx: 0, ly: 0 });

  useEffect(() => {
    return () => {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
    };
  }, []);

  const startDrag = ({ pageX, pageY, locationX, locationY } = {}) => {
    if (dragStartedRef.current || globalDragRef.current) return;
    const { x, y, lx, ly } = lastTouchRef.current;
    const touch = {
      pageX: pageX ?? x,
      pageY: pageY ?? y,
      locationX: locationX ?? lx,
      locationY: locationY ?? ly,
    };

    setIsHidden(true);
    dragStartedRef.current = true;
    dragFinalizedRef.current = false;
    latestProps.current.onDragStart(latestProps.current.plant, touch.pageX, touch.pageY, touch.locationX, touch.locationY);
  };

  const finalizeDrag = (moveX, moveY) => {
    if (!dragStartedRef.current || dragFinalizedRef.current) return;
    dragFinalizedRef.current = true;
    latestProps.current.onDragEnd(latestProps.current.plant, moveX, moveY, () => {
      setIsHidden(false);
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled && !globalDragRef.current,
      onMoveShouldSetPanResponder: (_, gesture) => {
        if (disabled) return false;
        // Allow dragging immediately once edit mode is active, or once a long-press has been triggered
        if (longPressTriggeredRef.current) return true;
        return latestProps.current.isEditing && !globalDragRef.current && (Math.abs(gesture.dx) > 1 || Math.abs(gesture.dy) > 1);
      },
      onPanResponderGrant: (evt) => {
        evt.persist?.();
        const { pageX, pageY, locationX, locationY } = evt.nativeEvent;
        lastTouchRef.current = { x: pageX, y: pageY, lx: locationX, ly: locationY };

        if (latestProps.current.isEditing) {
          startDrag(lastTouchRef.current);
        } else {
          longPressTriggeredRef.current = false;
          dragStartedRef.current = false;
          if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
          longPressTimeoutRef.current = setTimeout(() => {
            longPressTriggeredRef.current = true;
            onLongPress && onLongPress();
            startDrag(lastTouchRef.current);
          }, 400);
        }
      },
      onPanResponderMove: (evt, gesture) => {
        evt.persist?.();
        lastTouchRef.current = {
          x: evt.nativeEvent.pageX,
          y: evt.nativeEvent.pageY,
          lx: evt.nativeEvent.locationX,
          ly: evt.nativeEvent.locationY,
        };
        if (dragStartedRef.current) {
          Animated.event([null, { dx: globalPan.x, dy: globalPan.y }], { useNativeDriver: false })(evt, gesture);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (longPressTimeoutRef.current) {
          clearTimeout(longPressTimeoutRef.current);
          longPressTimeoutRef.current = null;
        }
        if (dragStartedRef.current) {
          finalizeDrag(gesture.moveX ?? lastTouchRef.current.x, gesture.moveY ?? lastTouchRef.current.y);
        } else if (isHidden) {
          setIsHidden(false);
        }
        longPressTriggeredRef.current = false;
        dragStartedRef.current = false;
      },
      onPanResponderTerminate: () => {
        if (longPressTimeoutRef.current) {
          clearTimeout(longPressTimeoutRef.current);
          longPressTimeoutRef.current = null;
        }
        finalizeDrag(lastTouchRef.current.x, lastTouchRef.current.y);
        longPressTriggeredRef.current = false;
        dragStartedRef.current = false;
        if (isHidden) setIsHidden(false);
      }
    })
  ).current;

  const panHandlers = disabled ? {} : panResponder.panHandlers;

  return (
    <Animated.View 
      {...panHandlers}
      style={[
        styles.plantContainer,
        isEditing && !isHidden && { transform: [{ rotate: wiggleAnim.interpolate({ inputRange: [-1, 1], outputRange: ['-2deg', '2deg'] }) }] },
        { opacity: isHidden ? 0 : 1 } 
      ]}
    >
      <PlantVisual plant={plant} isDraggingHighlight={false} />
    </Animated.View>
  );
});

// --- 3. MAIN GARDEN SCREEN ---
export default function GardenScreen({ route, navigation }) {
  const viewedUserId = route?.params?.userId || auth.currentUser?.uid;
  const isReadOnly = Boolean(route?.params?.readOnly && viewedUserId && viewedUserId !== auth.currentUser?.uid);
  const shouldPersistState = !isReadOnly;
  const viewedUsername = route?.params?.username || "User";

  const [allPlants, setAllPlants] = useState(shouldPersistState ? (persistedGardenState.allPlants || []) : []);
  const [pages, setPages] = useState([]);
  const [currentPageId, setCurrentPageId] = useState(shouldPersistState ? (persistedGardenState.currentPageId || "default") : "default");
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(shouldPersistState ? (persistedGardenState.isEditing || false) : false);
  const [globalDragging, setGlobalDragging] = useState(false);
  const [drawerScrollOffset, setDrawerScrollOffset] = useState(shouldPersistState ? (persistedGardenState.drawerScrollOffset || 0) : 0);
  const [drawerShouldShow, setDrawerShouldShow] = useState((shouldPersistState ? (persistedGardenState.currentPageId || "default") : "default") !== STORAGE_PAGE_ID);
  const [dragPageSwitching, setDragPageSwitching] = useState(false);
  const [dragEdge, setDragEdge] = useState(null);
  const currentPageRef = useRef(currentPageId);

  const globalPan = useRef(new Animated.ValueXY()).current;
  const globalDragRef = useRef(false);
  const [draggedGhost, setDraggedGhost] = useState(null); 
  const wiggleAnim = useRef(new Animated.Value(0)).current;
  const drawerShouldShowRef = useRef((shouldPersistState ? (persistedGardenState.currentPageId || "default") : "default") !== STORAGE_PAGE_ID);

  useEffect(() => {
    currentPageRef.current = currentPageId;
  }, [currentPageId]);

  useEffect(() => {
    const next = currentPageId !== STORAGE_PAGE_ID;
    drawerShouldShowRef.current = next;
    setDrawerShouldShow(next);
  }, [currentPageId]);

  const slotRefs = useRef({});
  const drawerRef = useRef(null);
  const drawerScrollRef = useRef(null);

  useEffect(() => {
    if (drawerScrollRef.current && drawerScrollOffset) {
      drawerScrollRef.current.scrollTo({ x: drawerScrollOffset, animated: false });
    }
  }, []);

  const goPrevPage = () => {
    const currentIndex = pages.findIndex(p => p.id === currentPageId);
    if (currentIndex > 0) {
      const prevId = pages[currentIndex - 1].id;
      setCurrentPageId(prevId);
      if (shouldPersistState) persistedGardenState.currentPageId = prevId;
      scrollToPageId(prevId);
    }
  };

  const goNextPage = () => {
    const currentIndex = pages.findIndex(p => p.id === currentPageId);
    if (currentIndex >= 0 && currentIndex < pages.length - 1) {
      const nextId = pages[currentIndex + 1].id;
      setCurrentPageId(nextId);
      if (shouldPersistState) persistedGardenState.currentPageId = nextId;
      scrollToPageId(nextId);
    }
  };

  const flatListRef = useRef(null);
  const { width, height } = useWindowDimensions();
  const pageScrollX = useRef(new Animated.Value(0)).current;

  const scrollToPageId = (pageId) => {
    const idx = pages.findIndex(p => p.id === pageId);
    if (idx === -1 || !flatListRef.current) return;
    try {
      flatListRef.current.scrollToIndex({ index: idx, animated: true });
    } catch (e) {
      // If the list isn't laid out yet, try again on the next tick
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToIndex({ index: idx, animated: true });
        }
      }, 0);
    }
  };

  const onPageScrollEnd = (e) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const idx = Math.round(offsetX / width);
    if (idx >= 0 && idx < pages.length) {
      setCurrentPageId(pages[idx].id);
    }
  };

  useEffect(() => {
    if (!viewedUserId) return;
    const uid = viewedUserId;
    const unsubLayout = onSnapshot(collection(db, "users", uid, "gardenLayout"), (layoutSnap) => {
      const layoutMap = {};
      layoutSnap.forEach(doc => {
        const pos = doc.data().shelfPosition;
        layoutMap[doc.id] = pos
          ? { ...pos, pageId: pos.pageId || "default" }
          : null;
      });
      const unsubGoals = onSnapshot(collection(db, "users", uid, "goals"), (goalsSnap) => {
        const merged = goalsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          shelfPosition: layoutMap[doc.id] || null 
        }));
        setAllPlants(merged);
        if (shouldPersistState) persistedGardenState.allPlants = merged;
        setLoading(false);
      });
      return () => unsubGoals();
    });
    return () => unsubLayout();
  }, [viewedUserId, shouldPersistState]);

  useEffect(() => {
    if (!viewedUserId) return;
    const uid = viewedUserId;
    const pagesRef = collection(db, "users", uid, "gardenPages");

    const unsubPages = onSnapshot(pagesRef, (snap) => {
      const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const hasDefault = docs.some(d => d.id === "default");
      if (!hasDefault && !isReadOnly) {
        setDoc(doc(pagesRef, "default"), { title: "Page 1", createdAt: Date.now() }, { merge: true });
      }

      const sorted = docs.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      setPages([{ id: STORAGE_PAGE_ID, title: 'Storage' }, ...sorted]);

      setCurrentPageId(prev => {
        const next = (prev && (prev === STORAGE_PAGE_ID || docs.some(d => d.id === prev))) ? prev : "default";
        if (shouldPersistState) persistedGardenState.currentPageId = next;
        return next;
      });
    });

    return () => unsubPages();
  }, [viewedUserId, isReadOnly, shouldPersistState]);

  useEffect(() => {
    if (!pages.length) return;
    if (!currentPageId) return;
    scrollToPageId(currentPageId);
  }, [pages, currentPageId]);

  useEffect(() => {
    if (isEditing) {
      Animated.loop(Animated.sequence([
        Animated.timing(wiggleAnim, { toValue: 1, duration: 130, useNativeDriver: true }),
        Animated.timing(wiggleAnim, { toValue: -1, duration: 130, useNativeDriver: true })
      ])).start();
    } else wiggleAnim.setValue(0);
  }, [isEditing]);

  const activateEditMode = useCallback(() => {
    if (isReadOnly) return;
    if (globalDragRef.current || globalDragging) return;
    if (!isEditing) {
      setIsEditing(true);
      if (shouldPersistState) persistedGardenState.isEditing = true;
    }
  }, [globalDragging, isEditing, isReadOnly, shouldPersistState]);

  const handleDragStart = (plant, touchX, touchY) => {
    if (isReadOnly) return;
    if (globalDragRef.current) return;

    if (shouldPersistState && !persistedGardenState.isEditing) {
      persistedGardenState.isEditing = true;
    }
    setIsEditing((prev) => (prev ? prev : true));

    globalDragRef.current = true;
    setGlobalDragging(true);
    globalPan.setValue({ x: 0, y: 0 });
    setDraggedGhost({ plant, x: touchX - 40, y: touchY - -50 }); 
  };

  const parseDestinationSlot = (dest) => {
    const lastUnderscore = dest.lastIndexOf('_');
    if (lastUnderscore === -1) return null;

    const shelfName = dest.slice(0, lastUnderscore);
    const slotIndex = parseInt(dest.slice(lastUnderscore + 1), 10);

    if (!shelfName || Number.isNaN(slotIndex)) return null;
    return { shelfName, slotIndex };
  };

  const handleDragEnd = async (plant, moveX, moveY, completeLocalDrag) => {
    let didUnlock = false;
    const unlock = () => {
      if (didUnlock) return;
      didUnlock = true;
      globalDragRef.current = false; 
      setGlobalDragging(false);
      setDraggedGhost(null); 
      completeLocalDrag();
    };

    try {
      const dest = await checkDropZones(moveX, moveY);
      if (dest) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setAllPlants(prev => {
          const newArr = [...prev];
          const pIdx = newArr.findIndex(p => p.id === plant.id);
          if (dest === 'drawer') {
            newArr[pIdx] = { ...newArr[pIdx], shelfPosition: null };
          } else {
            const parsedDest = parseDestinationSlot(dest);
            if (!parsedDest) {
              return prev;
            }
            const { shelfName, slotIndex } = parsedDest;
            const oldPos = plant.shelfPosition
              ? { ...plant.shelfPosition, pageId: plant.shelfPosition.pageId || currentPageId }
              : null;
            const occIdx = newArr.findIndex(
              (p) => p.shelfPosition?.pageId === currentPageId && p.shelfPosition?.shelfName === shelfName && p.shelfPosition?.slotIndex === slotIndex
            );
            if (occIdx !== -1 && newArr[occIdx].id !== plant.id) {
              newArr[occIdx] = { ...newArr[occIdx], shelfPosition: oldPos };
            }
            newArr[pIdx] = { ...newArr[pIdx], shelfPosition: { pageId: currentPageId, shelfName, slotIndex }};
          }
          if (shouldPersistState) persistedGardenState.allPlants = newArr;
          return newArr;
        });
        unlock();

        try {
          const uid = auth.currentUser.uid;
          if (dest === 'drawer') {
            await setDoc(doc(db, "users", uid, "gardenLayout", plant.id), { shelfPosition: null }, { merge: true });
          } else {
            const parsedDest = parseDestinationSlot(dest);
            if (!parsedDest) return;
            const { shelfName, slotIndex } = parsedDest;
            const batch = writeBatch(db);
            const occupant = allPlants.find(
              (p) => p.shelfPosition?.pageId === currentPageId && p.shelfPosition?.shelfName === shelfName && p.shelfPosition?.slotIndex === slotIndex
            );
            const oldPos = plant.shelfPosition
              ? { ...plant.shelfPosition, pageId: plant.shelfPosition.pageId || currentPageId }
              : null;

            if (occupant && occupant.id !== plant.id) {
              batch.set(doc(db, "users", uid, "gardenLayout", occupant.id), { shelfPosition: oldPos }, { merge: true });
            }
            batch.set(
              doc(db, "users", uid, "gardenLayout", plant.id),
              { shelfPosition: { pageId: currentPageId, shelfName, slotIndex } },
              { merge: true }
            );
            await batch.commit();
          }
        } catch (e) {
          console.error(e);
        }
        return;
      }

      Animated.spring(globalPan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start(() => {
        unlock();
      });
    } catch (e) {
      console.error('Drag end failed', e);
      unlock();
    }
  };

  const handleAddPage = async () => {
    if (isReadOnly || !auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const newPageRef = doc(collection(db, "users", uid, "gardenPages"));
    const realPageCount = pages.filter((p) => p.id !== STORAGE_PAGE_ID).length;
    const title = `Page ${realPageCount + 1}`;
    await setDoc(newPageRef, { title, createdAt: Date.now() });
    setCurrentPageId(newPageRef.id);
  };

  const handleResetPositions = async () => {
    if (isReadOnly || !auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const batch = writeBatch(db);
    allPlants.forEach((p) => {
      if (p.shelfPosition?.pageId === STORAGE_PAGE_ID) return;
      batch.set(doc(db, "users", uid, "gardenLayout", p.id), { shelfPosition: null }, { merge: true });
    });
    try {
      await batch.commit();
      setAllPlants((prev) => {
        const next = prev.map((p) => (
          p.shelfPosition?.pageId === STORAGE_PAGE_ID
            ? p
            : { ...p, shelfPosition: null }
        ));
        if (shouldPersistState) persistedGardenState.allPlants = next;
        return next;
      });
    } catch (e) {
      console.error('Failed to reset positions', e);
    }
  };

  const handleRemoveCurrentPage = async () => {
    if (isReadOnly || !auth.currentUser || !currentPageId) return;
    const realPages = pages.filter((p) => p.id !== STORAGE_PAGE_ID);
    if (realPages.length <= 1) {
      Alert.alert("Can't remove page", "You need at least one garden page.");
      return;
    }
    if (currentPageId === STORAGE_PAGE_ID || currentPageId === "default") {
      Alert.alert("Can't remove this page", "The default page can't be removed.");
      return;
    }

    const uid = auth.currentUser.uid;
    const remainingPages = pages.filter((p) => p.id !== currentPageId);
    const nextPageId = remainingPages.find((p) => p.id !== STORAGE_PAGE_ID)?.id || STORAGE_PAGE_ID;

    try {
      const batch = writeBatch(db);
      allPlants
        .filter((plant) => plant.shelfPosition?.pageId === currentPageId)
        .forEach((plant) => {
          batch.set(doc(db, "users", uid, "gardenLayout", plant.id), { shelfPosition: null }, { merge: true });
        });

      batch.delete(doc(db, "users", uid, "gardenPages", currentPageId));
      await batch.commit();

      setCurrentPageId(nextPageId);
      if (shouldPersistState) persistedGardenState.currentPageId = nextPageId;
    } catch (error) {
      console.error("Failed to remove page", error);
      Alert.alert("Error", "Could not remove this page right now.");
    }
  };

  const checkDropZones = async (moveX, moveY) => {
    if (currentPageRef.current !== STORAGE_PAGE_ID && drawerRef.current) {
      const dRect = await new Promise(res => drawerRef.current.measure((x, y, w, h, px, py) => {
        res(px !== undefined ? { l: px, r: px + w, t: py, b: py + h } : null);
      }));
      if (dRect && moveX >= dRect.l && moveX <= dRect.r && moveY >= dRect.t && moveY <= dRect.b) return 'drawer';
    }

    const prefix = `${currentPageRef.current}_`;
    const candidateKeys = Object.keys(slotRefs.current).filter((key) => key.startsWith(prefix));
    for (const slotKey of candidateKeys) {
      const slotRef = slotRefs.current[slotKey];
      if (!slotRef) continue;
      const rect = await new Promise(res => slotRef.measure((x, y, w, h, px, py) => {
        res(px !== undefined ? { l: px - 15, r: px + w + 15, t: py - 15, b: py + h + 15 } : null);
      }));
      if (rect && moveX >= rect.l && moveX <= rect.r && moveY >= rect.t && moveY <= rect.b) {
        const suffix = slotKey.slice(prefix.length);
        const lastUnderscore = suffix.lastIndexOf('_');
        if (lastUnderscore !== -1) {
          const shelfName = suffix.slice(0, lastUnderscore);
          const slotIndex = suffix.slice(lastUnderscore + 1);
          return `${shelfName}_${slotIndex}`;
        }
      }
    }
    return null;
  };

  // --- EXACT SHELF CONFIGS FROM ORIGINAL ---
  const SHELF_CONFIG = {
    topShelf: { side: 'left', width: '65%', offsetTop: -0, slots: 3 },
    middleShelf: { side: 'right', width: '65%', offsetTop: -50, slots: 3 },
    bottomShelf: { side: 'full', width: '100%', offsetTop: 130, slots: 4 },
  };

  const currentPage = pages.find(p => p.id === currentPageId);
  const pageTitle = currentPage?.title ?? "My Garden";

  const drawerPlants = allPlants.filter(p => !p.shelfPosition); // only show unassigned plants in the drawer

  const renderStorageShelf = (pageId, shelfIdx, plantsOnPage) => {
    const shelfName = `storageShelf_${shelfIdx}`;
    return (
      <View key={`${pageId}_${shelfName}`} style={[styles.shelfWrapper, styles.storageShelfWrapper]}>
        <LinearGradient
          colors={['#FF6A28', '#E0502A', '#B43A2A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.25 }}
          style={[styles.shelfLedge, styles.bottomShelfLedge, styles.storageShelfLedge]}
        >
          <View style={[styles.shelfHighlightLeft, styles.bottomShelfHighlightLeft]} />
          <View style={[styles.shelfHighlightRight, styles.bottomShelfHighlightRight]} />
          <View style={[styles.shelfCornerShade, styles.bottomShelfCornerShade]} />
          <View style={[styles.shelfBand, styles.bottomShelfBand]}>
            <View style={[styles.shelfBandDivider, styles.bottomShelfBandDivider]} />
            <LinearGradient
              colors={['#8A2D35', '#65243A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={[styles.shelfBandUpper, styles.bottomShelfBandUpper]}
            />
            <LinearGradient
              colors={['#592344', '#3D1736']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={[styles.shelfBandLower, styles.bottomShelfBandLower]}
            />
          </View>
        </LinearGradient>

        <View style={styles.slotsRow}>
          {Array.from({ length: 4 }).map((_, idx) => {
            const occupant = plantsOnPage.find(
              (p) => p.shelfPosition?.shelfName === shelfName && p.shelfPosition?.slotIndex === idx
            );
            const slotKey = `${pageId}_${shelfName}_${idx}`;
            return (
              <View key={slotKey} ref={el => slotRefs.current[slotKey] = el} style={[styles.slot, isEditing && styles.slotEditBox]} collapsable={false}>
                {occupant && (
                  <DraggablePlant
                    key={occupant.id}
                    plant={occupant}
                    isEditing={isEditing}
                    disabled={isReadOnly}
                    wiggleAnim={wiggleAnim}
                    onLongPress={activateEditMode}
                    globalPan={globalPan}
                    globalDragRef={globalDragRef}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDelete={() => setDoc(doc(db, "users", auth.currentUser.uid, "gardenLayout", occupant.id), { shelfPosition: null }, { merge: true })}
                  />
                )}
              </View>
            );
          })}
        </View>
      </View>
    );
  };

const renderShelf = (pageId, shelfName, plantsOnPage) => {
    const config = SHELF_CONFIG[shelfName];
    const isBottomShelf = shelfName === 'bottomShelf';

    const shelfDecor = (
      <>
        <View style={[styles.shelfHighlightLeft, isBottomShelf && styles.bottomShelfHighlightLeft]} />
        <View style={[styles.shelfHighlightRight, isBottomShelf && styles.bottomShelfHighlightRight]} />
        <View style={[styles.shelfCornerShade, isBottomShelf && styles.bottomShelfCornerShade]} />
        <View style={[styles.shelfBand, isBottomShelf && styles.bottomShelfBand]}>
          <View style={[styles.shelfBandDivider, isBottomShelf && styles.bottomShelfBandDivider]} />
          {isBottomShelf ? (
            <LinearGradient
              colors={['#8A2D35', '#65243A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={[styles.shelfBandUpper, styles.bottomShelfBandUpper]}
            />
          ) : (
            <View style={styles.shelfBandUpper} />
          )}
          {isBottomShelf ? (
            <LinearGradient
              colors={['#592344', '#3D1736']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={[styles.shelfBandLower, styles.bottomShelfBandLower]}
            />
          ) : (
            <View style={styles.shelfBandLower} />
          )}
        </View>
      </>
    );

    return (
      <View key={`${pageId}_${shelfName}`} style={[styles.shelfWrapper, { width: config.width, alignSelf: config.side==='left'?'flex-start':config.side==='right'?'flex-end':'center', marginTop: config.offsetTop }]}> 
        {isBottomShelf ? (
          <LinearGradient
            colors={['#FF6A28', '#E0502A', '#B43A2A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0.25 }}
            style={[styles.shelfLedge, styles.bottomShelfLedge]}
          >
            {shelfDecor}
          </LinearGradient>
        ) : (
          <View style={styles.shelfShadow}>
            <View style={styles.shelfLedge}>{shelfDecor}</View>
          </View>
        )}
        <View style={styles.slotsRow}>
          {Array.from({ length: config.slots }).map((_, idx) => {
            const occupant = plantsOnPage.find(p => p.shelfPosition?.shelfName === shelfName && p.shelfPosition?.slotIndex === idx);
            const slotKey = `${pageId}_${shelfName}_${idx}`;
            return (
              <View key={slotKey} ref={el => slotRefs.current[slotKey] = el} style={[styles.slot, isEditing && styles.slotEditBox]} collapsable={false}>
                {occupant && (
                  <DraggablePlant 
                    key={occupant.id}
                    plant={occupant} isEditing={isEditing} disabled={isReadOnly} wiggleAnim={wiggleAnim} 
                    onLongPress={activateEditMode} globalPan={globalPan} globalDragRef={globalDragRef} 
                    onDragStart={handleDragStart} onDragEnd={handleDragEnd}
                    onDelete={() => setDoc(doc(db, "users", auth.currentUser.uid, "gardenLayout", occupant.id), { shelfPosition: null }, { merge: true })}
                  />
                )}
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const storageTouchTimer = useRef(null);
  const storageTouchMoved = useRef(false);
  const storageTouchStartTime = useRef(0);

  const renderGardenPage = (page) => {
    if (page.id === STORAGE_PAGE_ID) {
      const plantsOnPage = allPlants.filter(p => p.shelfPosition?.pageId === STORAGE_PAGE_ID);
      return (
        <View style={[styles.storagePage, { width, height }]}>
          <View style={styles.storageHeader}>
            <Ionicons name="trophy" size={20} color="#FFD700" style={styles.storageHeaderIcon} />
            <Text style={styles.storageHeaderTitle}>Trophy Collection</Text>
            <Ionicons name="trophy" size={20} color="#FFD700" style={styles.storageHeaderIcon} />
          </View>
          <ScrollView
            style={styles.storageScroll}
            contentContainerStyle={styles.storageScrollContent}
            showsVerticalScrollIndicator={false}
            scrollEnabled={!globalDragging}
            keyboardShouldPersistTaps="handled"
            onTouchStart={() => {
              if (isReadOnly) return;
              storageTouchMoved.current = false;
              storageTouchStartTime.current = Date.now();
              storageTouchTimer.current = setTimeout(() => {
                if (!storageTouchMoved.current) activateEditMode();
              }, 350);
            }}
            onTouchMove={() => {
              if (isReadOnly) return;
              storageTouchMoved.current = true;
              clearTimeout(storageTouchTimer.current);
            }}
            onTouchEnd={() => {
              if (isReadOnly) return;
              clearTimeout(storageTouchTimer.current);
              const elapsed = Date.now() - storageTouchStartTime.current;
              if (!storageTouchMoved.current && elapsed < 300 && isEditing) {
                setIsEditing(false);
                if (shouldPersistState) persistedGardenState.isEditing = false;
              }
            }}
          >
            {Array.from({ length: Math.max(1, Math.ceil(plantsOnPage.length / 4) + 1) }).map((_, shelfIdx) =>
              renderStorageShelf(STORAGE_PAGE_ID, shelfIdx, plantsOnPage)
            )}
          </ScrollView>
        </View>
      );
    }

    const plantsOnPage = allPlants.filter(p => p.shelfPosition?.pageId === page.id);

    return (
      <TouchableWithoutFeedback
        delayLongPress={350}
        onLongPress={isReadOnly ? undefined : activateEditMode}
        onPress={() => {
          if (!isReadOnly && isEditing) {
            setIsEditing(false);
            if (shouldPersistState) persistedGardenState.isEditing = false;
          }
        }}
      >
        <View style={{ width, height, overflow: 'hidden' }}>
          <ImageBackground 
            source={FAR_BG} 
            style={[styles.farBackground, { width, height }]} 
            imageStyle={styles.farImageStyle} // <--- Manual adjustment here
            resizeMode="contain"
          >
            <ImageBackground 
              source={GARDEN_BG} 
              style={[styles.gardenBackground, { width, height }]} 
              imageStyle={styles.gardenImageStyle} // <--- Manual adjustment here
              resizeMode="cover"
            >
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
      </TouchableWithoutFeedback>
    );
  };

  if (loading) return <View style={styles.loader}><ActivityIndicator size="large" color="#2D5A27" /></View>;

  const dots = (
    <View style={styles.pageDots}>
      {pages.map((page, index) => {
        const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
        const isTrophyDot = page.id === STORAGE_PAGE_ID;
        const animatedWidth = pageScrollX.interpolate({
          inputRange,
          outputRange: [8, 20, 8],
          extrapolate: 'clamp',
        });
        const animatedOpacity = pageScrollX.interpolate({
          inputRange,
          outputRange: [0.45, 1, 0.45],
          extrapolate: 'clamp',
        });
        const animatedScale = pageScrollX.interpolate({
          inputRange,
          outputRange: [1, 1.15, 1],
          extrapolate: 'clamp',
        });
        const animatedBackgroundColor = pageScrollX.interpolate({
          inputRange,
          outputRange: isTrophyDot
            ? ['rgba(255, 196, 64, 0.45)', '#FFD54A', 'rgba(255, 196, 64, 0.45)']
            : ['rgb(103, 103, 103)', '#ffffff', 'rgb(103, 103, 103)'],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View
            key={page.id}
            style={[
              styles.dot,
              {
                width: animatedWidth,
                backgroundColor: animatedBackgroundColor,
                opacity: animatedOpacity,
                transform: [{ scale: animatedScale }],
              },
            ]}
          />
        );
      })}
    </View>
  );

  const pageIndex = pages.findIndex(p => p.id === currentPageId);

  return (
  <View style={styles.container}>
    {isReadOnly && (
      <View style={styles.readOnlyHeader}>
        <TouchableOpacity style={styles.readOnlyBackBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.readOnlyHeaderTitle} numberOfLines={1}>{viewedUsername}'s Garden</Text>
      </View>
    )}

    {!isReadOnly && isEditing && (
      <TouchableOpacity style={styles.addPageFab} onPress={handleAddPage}>
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>
    )}

    {!isReadOnly && isEditing && (
      <TouchableOpacity style={styles.removePageFab} onPress={handleRemoveCurrentPage}>
        <Ionicons name="trash" size={20} color="#fff" />
      </TouchableOpacity>
    )}

    {!isReadOnly && isEditing && (
      <TouchableOpacity style={styles.resetFab} onPress={handleResetPositions}>
        <Ionicons name="refresh" size={22} color="#fff" />
      </TouchableOpacity>
    )}

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
      scrollEnabled={!globalDragging}
      getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
      initialScrollIndex={pageIndex >= 0 ? pageIndex : 0}
      renderItem={({ item }) => (
        <View style={{ width, flex: 1 }}>
          {renderGardenPage(item)}
        </View>
      )}
      style={[styles.pageList, { width, height }]}
    />

    <View style={styles.pageDotsContainer}>
      {dots}
    </View>

      <View
        pointerEvents={drawerShouldShow ? 'auto' : 'none'}
        style={[
          styles.drawer,
          !isReadOnly && isEditing && styles.drawerEditBox,
          !drawerShouldShow && styles.drawerHidden,
        ]}
        ref={drawerRef}
        collapsable={false}
      >
        <View style={styles.drawerTopBandPrimary} />
        <View style={styles.drawerTopBandSecondary} />
        <ScrollView
          ref={drawerScrollRef}
          horizontal
          directionalLockEnabled
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          bounces={false}
          alwaysBounceVertical={false}
          contentContainerStyle={[styles.drawerList, { flexDirection: 'row', alignItems: 'center' }]}
          scrollEnabled={!globalDragging}
          scrollEventThrottle={16}
          onScroll={(e) => {
            const x = e.nativeEvent.contentOffset.x;
            setDrawerScrollOffset(x);
            if (shouldPersistState) persistedGardenState.drawerScrollOffset = x;
          }}
        >
          {drawerPlants.map(plant => (
            <View key={plant.id} style={{ marginHorizontal: 10 }}>
              <DraggablePlant 
                plant={plant} isEditing={isEditing} disabled={isReadOnly} wiggleAnim={wiggleAnim} 
                onLongPress={activateEditMode} globalPan={globalPan} globalDragRef={globalDragRef} 
                onDragStart={handleDragStart} onDragEnd={handleDragEnd}
              />
            </View>
          ))}
        </ScrollView>
      </View>

      {draggedGhost && (
        <Animated.View style={[styles.ghost, { left: draggedGhost.x, top: draggedGhost.y, transform: globalPan.getTranslateTransform() }]}>
          <PlantVisual plant={draggedGhost.plant} isDraggingHighlight={true} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdfbf700' },
  readOnlyHeader: {
    position: 'absolute',
    top: 48,
    left: 14,
    right: 14,
    zIndex: 40,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 25, 45, 0.82)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  readOnlyBackBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginRight: 10,
  },
  readOnlyHeaderTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  pageNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  pageNavBtn: { padding: 4 },
  addPageFab: { 
    position: 'absolute', 
    top: 50, 
    right: 20, 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    backgroundColor: '#2D5A27', 
    justifyContent: 'center', 
    alignItems: 'center', 
    zIndex: 30, 
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  resetFab: { 
    position: 'absolute', 
    top: 50, 
    right: 88, 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    backgroundColor: '#B22222', 
    justifyContent: 'center', 
    alignItems: 'center', 
    zIndex: 30, 
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  removePageFab: {
    position: 'absolute',
    top: 50,
    right: 156,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4C4C4C',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  pageDotsContainer: { position: 'absolute', bottom:10, left: 0, right: 0, alignItems: 'center', zIndex: 999999 },
  resetBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#B22222', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, marginRight: 10 },
  addPageText: { color: '#fff', marginLeft: 6, fontWeight: '700' },
  editBtn: { backgroundColor: '#eee', paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20 },
  doneBtn: { backgroundColor: '#2D5A27', paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20 },
  btnText: { fontWeight: 'bold', color: '#444' },
  pageDots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgb(103, 103, 103)', marginHorizontal: 4 },
  pageList: { flex: 1 },
  storagePage: { flex: 1, backgroundColor: '#242347' },
  storageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 54,
    paddingBottom: 14,
    paddingHorizontal: 20,
    backgroundColor: '#1a1836',
    borderBottomWidth: 1,
    borderBottomColor: '#2e2b5a',
  },
  storageHeaderTitle: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginHorizontal: 10,
    textShadowColor: 'rgba(255, 200, 0, 0.45)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  storageHeaderIcon: {
    opacity: 0.9,
  },
  storageScroll: { flex: 1 },
  storageScrollContent: { paddingTop: 20, paddingBottom: 220, gap: 18 },

  gardenMain: { flex: 1, paddingBottom: 160, paddingTop: 40, justifyContent: 'space-around' },
  shelfWrapper: { height: 132, justifyContent: 'flex-end', marginBottom: 20, marginHorizontal: -4, overflow: 'visible' },
  storageShelfWrapper: { width: '100%', alignSelf: 'center', marginTop: 0, marginBottom: 0, overflow: 'visible' },
  shelfShadow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    height: 60,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width:10, height: 8 },
    shadowOpacity: 0.20,
    shadowRadius: 0,
    elevation: 8,
  },
  shelfLedge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    height: 60,
    backgroundColor: '#FA6424',
    borderRadius: 16,
    overflow: 'hidden',
  },
  shelfHighlightLeft: {
    position: 'absolute',
    top: 12,
    left: '8%',
    width: '46%',
    height: 14,
    borderRadius: 12,
    backgroundColor: '#FF9F45',
    opacity: 0.95,
  },
  shelfHighlightRight: {
    position: 'absolute',
    top: 18,
    right: '6%',
    width: '38%',
    height: 16,
    borderRadius: 14,
    backgroundColor: '#FF9A3E',
    opacity: 0.94,
  },
  shelfCornerShade: {
    position: 'absolute',
    top: 6,
    right: '3%',
    width: '20%',
    height: 6,
    borderRadius: 6,
    backgroundColor: '#ff8a37',
    opacity: 0.65,
  },
  shelfBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 22,
  },
  shelfBandDivider: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 0,
    backgroundColor: '#A63A3A',
    zIndex: 2,
  },
  shelfBandUpper: {
    position: 'absolute',
    top: 1,
    left: 0,
    right: 0,
    height: 18,
    backgroundColor: '#a84615',
  },
  shelfBandLower: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 12,
    backgroundColor: '#611c45',
  },
  bottomShelfLedge: {
    height: 65,
    borderRadius: 0,
  },
  bottomShelfHighlightLeft: {
    top: 12,
    left: '8%',
    width: '48%',
    height: 11,
    borderRadius: 8,
    backgroundColor: '#FF9F4A',
    opacity: 0.92,
  },
  bottomShelfHighlightRight: {
    top: 18,
    right: '-1%',
    width: '39%',
    height: 18,
    borderRadius: 12,
    backgroundColor: '#FF9742',
    opacity: 0.9,
  },
  bottomShelfCornerShade: {
    top: 6,
    right: '4%',
    width: '38%',
    height: 5,
    borderRadius: 4,
    backgroundColor: '#f44d2c',
    opacity: 0.5,
  },
  bottomShelfBand: {
    height: 22,
  },
  bottomShelfBandDivider: {
    height: 1,
    backgroundColor: '#9A3438',
  },
  bottomShelfBandUpper: {
    top: 1,
    height: 16,
  },
  bottomShelfBandLower: {
    height: 11,
  },
  storageShelfLedge: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  slotsRow: { height: 85, flexDirection: "row", justifyContent: "space-around", width: '100%', zIndex: 5 },
  slot: { width: 80, height: 80, justifyContent: 'flex-end', alignItems: 'center', borderRadius: 12 },
  slotEditBox: { borderWidth: 2, borderColor: '#d1d1d1', borderStyle: 'dashed', backgroundColor: 'rgba(0,0,0,0.02)' },

  drawer: {
    position: 'absolute',
    bottom: -30,
    height: 170,
    width: '100%',
    backgroundColor: '#242347',
    zIndex: 100,
    overflow: 'hidden',
  },
  drawerHidden: {
    opacity: 0,
  },
  pageDrawerUnderlay: {
    position: 'absolute',
    bottom:33,
    left: 0,
    right: 0,
    height: 170,
    backgroundColor: '#242347',
    zIndex: 1,
    overflow: 'hidden',
  },
  pageDrawerUnderlayTopBandPrimary: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 12,
    backgroundColor: '#111338',
  },
  pageDrawerUnderlayTopBandSecondary: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: '#1A1D45',
  },
  drawerTopBandPrimary: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 12,
    backgroundColor: '#111338',
  },
  drawerTopBandSecondary: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: '#1A1D45',
  },
  drawerEditBox: { borderWidth: 3, borderColor: '#5D5F8A', borderStyle: 'dashed' },
  drawerList: { paddingHorizontal: 0, alignItems: 'center', minWidth: '100%', flexGrow: 1, justifyContent: 'center', bottom: -0, paddingTop: 14 },

  plantContainer: { width: 100, height: 125, alignItems: 'center', justifyContent: 'flex-end', bottom: -15 },
  plantAssemblyWrapper: { alignItems: 'center', justifyContent: 'flex-end', width: '100%', height: '10', bottom: -10 },
  plantAssembly: { alignItems: 'center', justifyContent: 'flex-end', width: '100%', flex: 1 },
  plantNameLabel: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
    width: 90,
    marginTop: 0,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    letterSpacing: 0.2,
    bottom: 30,
  },
  potBackground: { width: 80, height: 80, alignItems: 'center', justifyContent: 'flex-end', position: 'relative', bottom: 10 },
  particleLayer: { position: 'absolute', left: -8, right: -8, bottom: 30, height: 80, zIndex: 3 },
  particleDot: { position: 'absolute', width: 6, height: 6, borderRadius: 3 },
  potImageTexture: { width: '100%', height: '70%', bottom: 0, position: 'absolute' },
  plantImage: { width: 65, height: 85, position: 'absolute', bottom: 68, zIndex: 1 },
  
  potLabel: { position: 'absolute', bottom: 30, minWidth: 24, minHeight: 24, justifyContent: 'center', alignItems: 'center', zIndex: 4 },

  gardenBackground: { flex: 1, width: '100%', height: '100%', bottom: 0 },
  backgroundImageTexture: { top: -80 },
  
  draggingShadow: { opacity: 1, transform: [{ scale: 1.1 }] },
  deleteBadge: { position: 'absolute', top: -10, left: -10, backgroundColor: '#E74C3C', width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', zIndex: 10, borderWidth: 2, borderColor: '#fff' },
  ghost: { position: 'absolute', pointerEvents: 'none', zIndex: 9999 },





  // The container stays fullscreen
  farBackground: {
    flex: 1,
    width: '100%',
    backgroundColor: '#1a1a1a', // Fallback color
  },

  // MANUALLY ADJUST THE FAR IMAGE HERE
  farImageStyle: {
    top: -0,            // Move up/down (e.g., -50 to pull it up)
    left: 40,           // Move left/right
    opacity: 1,      // Good for making it feel "distant"
    height: '120%', 
    transform: [
    { scale: 1.3 }   // Zooms in/out on the garden texture specifically
    ],   // Make it slightly taller than the screen if you need to offset 'top'
  },

  gardenBackground: {
    flex: 1,
    width: '100%',
  },

  // MANUALLY ADJUST THE GARDEN/FLOOR IMAGE HERE
  gardenImageStyle: {
    top: -80,          // Shifts the garden texture relative to the shelves
    transform: [
      { scale: 1.1 }   // Zooms in/out on the garden texture specifically
    ],
  },
});