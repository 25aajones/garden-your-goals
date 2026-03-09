import React, { useState, useCallback, useRef, useEffect, memo } from "react";
import { 
  View, Text, StyleSheet, ActivityIndicator, ScrollView, FlatList, 
  Animated, TouchableOpacity, Platform, UIManager, LayoutAnimation, PanResponder, Image, ImageBackground, useWindowDimensions 
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
import { PLANT_ASSETS } from "../constants/PlantAssets";
const FAR_BG = require('../assets/far_background.png');
const GARDEN_BG = require('../assets/garden_BG.png');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const POT_IMAGE = require('../assets/plants/pot.png');

// --- 1. PLANT VISUAL COMPONENT ---
const PlantVisual = ({ plant, isDraggingHighlight }) => {
  const total = Number(plant.totalCompletions) || 0;
  
  let stage = 'stage1';
  if (total > 30) stage = 'stage4';
  else if (total > 15) stage = 'stage3';
  else if (total > 5) stage = 'stage2';

  const status = (plant.healthLevel === 1) ? 'dead' : 'alive';
  const species = plant.plantSpecies || (plant.type !== "completion" && plant.type !== "quantity" ? plant.type : "fern");
  const asset = PLANT_ASSETS[species]?.[stage]?.[status] || PLANT_ASSETS['fern']['stage1']['alive'];

  const getPotIcon = () => {
    if (plant.icon) return plant.icon;
    if (plant.goalIcon) return plant.goalIcon;
    return plant.type === 'coding' ? 'code-slash' : 'leaf';
  };

  return (
    <View style={styles.plantAssembly}>
      <ImageBackground source={POT_IMAGE} style={styles.potBackground} imageStyle={styles.potImageTexture} resizeMode="contain">
        <Image source={asset} style={[styles.plantImage, isDraggingHighlight && styles.draggingShadow]} resizeMode="contain" />
        <View style={styles.potLabel}>
          <Ionicons name={getPotIcon()} size={18} color="#fff" />
        </View>
      </ImageBackground>
    </View>
  );
};

// --- 2. DRAGGABLE WRAPPER ---
const DraggablePlant = memo(({ plant, isEditing, wiggleAnim, onLongPress, onDragStart, onDragEnd, onDelete, globalPan, globalDragRef }) => {
  const [isHidden, setIsHidden] = useState(false);
  const latestProps = useRef({ plant, onDragStart, onDragEnd, onDelete, isEditing });
  latestProps.current = { plant, onDragStart, onDragEnd, onDelete, isEditing };

  const longPressTriggeredRef = useRef(false);
  const longPressTimeoutRef = useRef(null);
  const dragStartedRef = useRef(false);
  const lastTouchRef = useRef({ x: 0, y: 0, lx: 0, ly: 0 });

  useEffect(() => {
    return () => {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
    };
  }, []);

  const startDrag = ({ pageX, pageY, locationX, locationY } = {}) => {
    const { x, y, lx, ly } = lastTouchRef.current;
    const touch = {
      pageX: pageX ?? x,
      pageY: pageY ?? y,
      locationX: locationX ?? lx,
      locationY: locationY ?? ly,
    };

    setIsHidden(true);
    dragStartedRef.current = true;
    latestProps.current.onDragStart(latestProps.current.plant, touch.pageX, touch.pageY, touch.locationX, touch.locationY);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !globalDragRef.current,
      onMoveShouldSetPanResponder: (_, gesture) => {
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
          latestProps.current.onDragEnd(latestProps.current.plant, gesture.moveX, gesture.moveY, () => {
            setIsHidden(false);
          });
        }
        longPressTriggeredRef.current = false;
        dragStartedRef.current = false;
      },
      onPanResponderTerminate: () => {
        if (longPressTimeoutRef.current) {
          clearTimeout(longPressTimeoutRef.current);
          longPressTimeoutRef.current = null;
        }
        longPressTriggeredRef.current = false;
        dragStartedRef.current = false;
        setIsHidden(false);
      }
    })
  ).current;

  return (
    <Animated.View 
      {...panResponder.panHandlers}
      style={[
        styles.plantContainer,
        isEditing && !isHidden && { transform: [{ rotate: wiggleAnim.interpolate({ inputRange: [-1, 1], outputRange: ['-2deg', '2deg'] }) }] },
        { opacity: isHidden ? 0 : 1 } 
      ]}
    >
      {isEditing && plant.shelfPosition && !isHidden && (
        <TouchableOpacity style={styles.deleteBadge} onPress={onDelete}>
          <Ionicons name="close" size={12} color="#fff" />
        </TouchableOpacity>
      )}
      <PlantVisual plant={plant} isDraggingHighlight={false} />
    </Animated.View>
  );
});

// --- 3. MAIN GARDEN SCREEN ---
export default function GardenScreen() {
  const [allPlants, setAllPlants] = useState(persistedGardenState.allPlants || []);
  const [pages, setPages] = useState([]);
  const [currentPageId, setCurrentPageId] = useState(persistedGardenState.currentPageId || "default");
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(persistedGardenState.isEditing || false);
  const [globalDragging, setGlobalDragging] = useState(false);
  const [drawerScrollOffset, setDrawerScrollOffset] = useState(persistedGardenState.drawerScrollOffset || 0);
  const [dragPageSwitching, setDragPageSwitching] = useState(false);
  const [dragEdge, setDragEdge] = useState(null);
  const currentPageRef = useRef(currentPageId);

  const globalPan = useRef(new Animated.ValueXY()).current;
  const globalDragRef = useRef(false);
  const [draggedGhost, setDraggedGhost] = useState(null); 
  const wiggleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    currentPageRef.current = currentPageId;
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
      persistedGardenState.currentPageId = prevId;
      scrollToPageId(prevId);
    }
  };

  const goNextPage = () => {
    const currentIndex = pages.findIndex(p => p.id === currentPageId);
    if (currentIndex >= 0 && currentIndex < pages.length - 1) {
      const nextId = pages[currentIndex + 1].id;
      setCurrentPageId(nextId);
      persistedGardenState.currentPageId = nextId;
      scrollToPageId(nextId);
    }
  };

  const flatListRef = useRef(null);
  const { width, height } = useWindowDimensions();

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
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
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
        persistedGardenState.allPlants = merged;
        setLoading(false);
      });
      return () => unsubGoals();
    });
    return () => unsubLayout();
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const pagesRef = collection(db, "users", uid, "gardenPages");

    const unsubPages = onSnapshot(pagesRef, (snap) => {
      const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const hasDefault = docs.some(d => d.id === "default");
      if (!hasDefault) {
        setDoc(doc(pagesRef, "default"), { title: "Page 1", createdAt: Date.now() }, { merge: true });
      }

      const sorted = docs.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      setPages(sorted);

      setCurrentPageId(prev => {
        const next = (prev && docs.some(d => d.id === prev)) ? prev : "default";
        persistedGardenState.currentPageId = next;
        return next;
      });
    });

    return () => unsubPages();
  }, []);

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

  const handleDragStart = (plant, touchX, touchY) => {
    globalDragRef.current = true;
    setGlobalDragging(true);
    globalPan.setValue({ x: 0, y: 0 });
    setDraggedGhost({ plant, x: touchX - 30, y: touchY - 25 }); 
  };

  const handleDragEnd = async (plant, moveX, moveY, completeLocalDrag) => {
    const unlock = () => {
      globalDragRef.current = false; 
      setGlobalDragging(false);
      setDraggedGhost(null); 
      completeLocalDrag();
    };

    const dest = await checkDropZones(moveX, moveY);
    if (dest) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setAllPlants(prev => {
        const newArr = [...prev];
        const pIdx = newArr.findIndex(p => p.id === plant.id);
        if (dest === 'drawer') {
          newArr[pIdx] = { ...newArr[pIdx], shelfPosition: null };
        } else {
          const [shelf, idx] = dest.split('_');
          const slotIdx = parseInt(idx);
          const oldPos = plant.shelfPosition
            ? { ...plant.shelfPosition, pageId: plant.shelfPosition.pageId || currentPageId }
            : null;
          const occIdx = newArr.findIndex(
            (p) => p.shelfPosition?.pageId === currentPageId && p.shelfPosition?.shelfName === shelf && p.shelfPosition?.slotIndex === slotIdx
          );
          if (occIdx !== -1 && newArr[occIdx].id !== plant.id) {
            newArr[occIdx] = { ...newArr[occIdx], shelfPosition: oldPos };
          }
          newArr[pIdx] = { ...newArr[pIdx], shelfPosition: { pageId: currentPageId, shelfName: shelf, slotIndex: slotIdx }};
        }
        persistedGardenState.allPlants = newArr;
        return newArr;
      });
      unlock();

      try {
        const uid = auth.currentUser.uid;
        if (dest === 'drawer') {
          await setDoc(doc(db, "users", uid, "gardenLayout", plant.id), { shelfPosition: null }, { merge: true });
        } else {
          const [shelf, idx] = dest.split('_');
          const batch = writeBatch(db);
          // Only swap with an occupant on the current page (avoid affecting same-slot plants on other pages)
          const occupant = allPlants.find(
            (p) => p.shelfPosition?.pageId === currentPageId && p.shelfPosition?.shelfName === shelf && p.shelfPosition?.slotIndex === parseInt(idx)
          );

          // For plants dragged from drawer, oldPos should remain null (drawer)
          const oldPos = plant.shelfPosition
            ? { ...plant.shelfPosition, pageId: plant.shelfPosition.pageId || currentPageId }
            : null;

          if (occupant && occupant.id !== plant.id) {
            batch.set(doc(db, "users", uid, "gardenLayout", occupant.id), { shelfPosition: oldPos }, { merge: true });
          }
          batch.set(
            doc(db, "users", uid, "gardenLayout", plant.id),
            { shelfPosition: { pageId: currentPageId, shelfName: shelf, slotIndex: parseInt(idx) } },
            { merge: true }
          );
          await batch.commit();
        }
      } catch (e) { console.error(e); }
    } else {
      Animated.spring(globalPan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start(unlock);
    }
  };

  const handleAddPage = async () => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const newPageRef = doc(collection(db, "users", uid, "gardenPages"));
    const title = `Page ${pages.length + 1}`;
    await setDoc(newPageRef, { title, createdAt: Date.now() });
    setCurrentPageId(newPageRef.id);
  };

  const handleResetPositions = async () => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const batch = writeBatch(db);
    allPlants.forEach((p) => {
      batch.set(doc(db, "users", uid, "gardenLayout", p.id), { shelfPosition: null }, { merge: true });
    });
    try {
      await batch.commit();
      setAllPlants((prev) => {
        const next = prev.map((p) => ({ ...p, shelfPosition: null }));
        persistedGardenState.allPlants = next;
        return next;
      });
    } catch (e) {
      console.error('Failed to reset positions', e);
    }
  };

  const checkDropZones = async (moveX, moveY) => {
    if (drawerRef.current) {
      const dRect = await new Promise(res => drawerRef.current.measure((x, y, w, h, px, py) => {
        res(px !== undefined ? { l: px, r: px + w, t: py, b: py + h } : null);
      }));
      if (dRect && moveX >= dRect.l && moveX <= dRect.r && moveY >= dRect.t && moveY <= dRect.b) return 'drawer';
    }
    // Only consider slots on the active page (prevents dropping into off-screen pages)
    for (const shelfName of Object.keys(SHELF_CONFIG)) {
      const slots = SHELF_CONFIG[shelfName].slots;
      for (let idx = 0; idx < slots; idx += 1) {
        const slotKey = `${currentPageId}_${shelfName}_${idx}`;
        const slotRef = slotRefs.current[slotKey];
        if (!slotRef) continue;
        const rect = await new Promise(res => slotRef.measure((x, y, w, h, px, py) => {
          res(px !== undefined ? { l: px - 15, r: px + w + 15, t: py - 15, b: py + h + 15 } : null);
        }));
        if (rect && moveX >= rect.l && moveX <= rect.r && moveY >= rect.t && moveY <= rect.b) {
          return `${shelfName}_${idx}`;
        }
      }
    }
    return null;
  };

  // --- EXACT SHELF CONFIGS FROM ORIGINAL ---
  const SHELF_CONFIG = {
    topShelf: { side: 'left', width: '60%', offsetTop: -30, slots: 3 },
    middleShelf: { side: 'right', width: '60%', offsetTop: -570, slots: 3 },
    bottomShelf: { side: 'full', width: '100%', offsetTop: -30, slots: 4 },
  };

  const currentPage = pages.find(p => p.id === currentPageId);
  const pageTitle = currentPage?.title ?? "My Garden";

  const drawerPlants = allPlants.filter(p => !p.shelfPosition); // only show unassigned plants in the drawer

const renderShelf = (pageId, shelfName, plantsOnPage) => {
    const config = SHELF_CONFIG[shelfName];
    return (
      <View key={`${pageId}_${shelfName}`} style={[styles.shelfWrapper, { width: config.width, alignSelf: config.side==='left'?'flex-start':config.side==='right'?'flex-end':'center', marginTop: config.offsetTop }]}> 
        <View style={styles.shelfLedge} /><View style={styles.shelfFront} />
        <View style={styles.slotsRow}>
          {Array.from({ length: config.slots }).map((_, idx) => {
            const occupant = plantsOnPage.find(p => p.shelfPosition?.shelfName === shelfName && p.shelfPosition?.slotIndex === idx);
            const slotKey = `${pageId}_${shelfName}_${idx}`;
            return (
              <View key={slotKey} ref={el => slotRefs.current[slotKey] = el} style={[styles.slot, isEditing && styles.slotEditBox]} collapsable={false}>
                {occupant && (
                  <DraggablePlant 
                    key={occupant.id}
                    plant={occupant} isEditing={isEditing} wiggleAnim={wiggleAnim} 
                    onLongPress={() => setIsEditing(true)} globalPan={globalPan} globalDragRef={globalDragRef} 
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

  const renderGardenPage = (page) => {
    const plantsOnPage = allPlants.filter(p => p.shelfPosition?.pageId === page.id);

    return (
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
            <View style={styles.gardenMain}>
              {["topShelf", "middleShelf", "bottomShelf"].map((shelfName) => renderShelf(page.id, shelfName, plantsOnPage))}
            </View>
          </ImageBackground>
        </ImageBackground>
      </View>
    );
  };

  if (loading) return <View style={styles.loader}><ActivityIndicator size="large" color="#2D5A27" /></View>;

  const dots = (
    <View style={styles.pageDots}>
      {pages.map((page) => (
        <View key={page.id} style={[styles.dot, page.id === currentPageId && styles.dotActive]} />
      ))}
    </View>
  );

  const pageIndex = pages.findIndex(p => p.id === currentPageId);

  return (
  <View style={styles.container}>
    <View style={styles.header}>
      <View style={styles.headerTopRow}>
        <View style={styles.pageNav}>
          <TouchableOpacity
            style={styles.pageNavBtn}
            disabled={pageIndex <= 0}
            onPress={goPrevPage}
          >
            <Ionicons name="chevron-back" size={20} color={pageIndex <= 0 ? "#bbb" : "#2D5A27"} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>{pageTitle}</Text>

          <TouchableOpacity
            style={styles.pageNavBtn}
            disabled={pageIndex === -1 || pageIndex >= pages.length - 1}
            onPress={goNextPage}
          >
            <Ionicons name="chevron-forward" size={20} color={pageIndex === -1 || pageIndex >= pages.length - 1 ? "#bbb" : "#2D5A27"} />
          </TouchableOpacity>
        </View>

        <View style={styles.headerControls}>
          {isEditing && (
            <TouchableOpacity style={styles.addPageBtn} onPress={handleAddPage}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.addPageText}>Page</Text>
            </TouchableOpacity>
          )}
          {isEditing && (
            <TouchableOpacity style={styles.resetBtn} onPress={handleResetPositions}>
              <Ionicons name="refresh" size={16} color="#fff" />
              <Text style={styles.addPageText}>Reset</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={isEditing ? styles.doneBtn : styles.editBtn}
            onPress={() => {
              setIsEditing(!isEditing);
              persistedGardenState.isEditing = !isEditing;
            }}
          >
            <Text style={styles.btnText}>{isEditing ? "Done" : "Edit"}</Text>
          </TouchableOpacity>
        </View>
      </View>
      {dots}
    </View>

    <FlatList
      ref={flatListRef}
      data={pages}
      keyExtractor={(item) => item.id}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
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
        


      <View style={styles.drawer} ref={drawerRef} collapsable={false}>
        <View style={styles.drawerLip} />
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
            persistedGardenState.drawerScrollOffset = x;
          }}
        >
          {drawerPlants.map(plant => (
            <View key={plant.id} style={{ marginHorizontal: 10 }}>
              <DraggablePlant 
                plant={plant} isEditing={isEditing} wiggleAnim={wiggleAnim} 
                onLongPress={() => setIsEditing(true)} globalPan={globalPan} globalDragRef={globalDragRef} 
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
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { paddingTop: 60, paddingBottom: 10, paddingHorizontal: 20, backgroundColor: "#fff", flexDirection: 'column', zIndex: 10 },
  pageNav: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  pageNavBtn: { padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: "900", color: "#2D5A27", textAlign: 'center' },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerControls: { flexDirection: 'row', alignItems: 'center' },
  addPageBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2D5A27', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, marginRight: 10 },
  resetBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#B22222', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, marginRight: 10 },
  addPageText: { color: '#fff', marginLeft: 6, fontWeight: '700' },
  editBtn: { backgroundColor: '#eee', paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20 },
  doneBtn: { backgroundColor: '#2D5A27', paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20 },
  btnText: { fontWeight: 'bold', color: '#444' },
  pageDots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.2)', marginHorizontal: 4 },
  dotActive: { backgroundColor: '#2D5A27' },
  pageList: { flex: 1 },

  gardenMain: { flex: 1, paddingBottom: 160, paddingTop: 40, justifyContent: 'space-around' },
  shelfWrapper: { height: 130, justifyContent: 'flex-end', marginBottom: 20 },
  shelfLedge: { position: 'absolute', bottom: 6, width: '102%', height: 50, backgroundColor: '#945b35', borderRadius: 2 },
  shelfFront: { position: 'absolute', bottom: 0, height: 16, width: '102%', backgroundColor: '#713d17', borderRadius: 2 },
  slotsRow: { height: 85, flexDirection: "row", justifyContent: "space-around", width: '100%', zIndex: 5 },
  slot: { width: 80, height: 80, justifyContent: 'flex-end', alignItems: 'center', borderRadius: 12 },
  slotEditBox: { borderWidth: 2, borderColor: '#d1d1d1', borderStyle: 'dashed', backgroundColor: 'rgba(0,0,0,0.02)' },

  drawer: { position: 'absolute', bottom: -30, height: 170, width: '100%', backgroundColor: '#3d2b1f', borderTopWidth: 4, borderColor: '#2a1d15', zIndex: 100 },
  drawerList: { paddingHorizontal: 0, alignItems: 'center', minWidth: '100%', flexGrow: 1, justifyContent: 'center', bottom: -0},

  plantContainer: { width: 100, height: 125, alignItems: 'center', justifyContent: 'flex-end', bottom: -15 },
  plantAssembly: { alignItems: 'center', justifyContent: 'flex-end', width: '100%', height: '100%' },
  potBackground: { width: 70, height: 90, alignItems: 'center', justifyContent: 'flex-end', position: 'relative' },
  potImageTexture: { width: '100%', height: '60%', bottom: 0, position: 'absolute' },
  plantImage: { width: 65, height: 85, position: 'absolute', bottom: 74, zIndex: 1 },
  
  potLabel: { position: 'absolute', bottom: 40, minWidth: 24, minHeight: 24, justifyContent: 'center', alignItems: 'center', zIndex: 2 },

  gardenBackground: { flex: 1, width: '100%', height: '100%', bottom: 0 },
  backgroundImageTexture: { top: -80 },
  
  draggingShadow: { opacity: 0.7, transform: [{ scale: 1.1 }] },
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
    top: -90,            // Move up/down (e.g., -50 to pull it up)
    left: 15,           // Move left/right
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
    top: -180,          // Shifts the garden texture relative to the shelves
    transform: [
      { scale: 1.1 }   // Zooms in/out on the garden texture specifically
    ],
  },
});