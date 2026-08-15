import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

import { executeAction, registerAction } from '../actionRegistry';
import { BestiaryDrawer, type BestiaryDrawerRef } from '../BestiaryDrawer';
import { CookingDrawer, type CookingDrawerRef } from '../CookingDrawer';
import { CraftingDrawer, type CraftingDrawerRef } from '../CraftingDrawer';
import { CropInfoDrawer, type CropInfoDrawerRef } from '../CropInfoDrawer';
import { EquipDrawer, type EquipDrawerRef } from '../EquipDrawer';
import { FarmInfoDrawer, type FarmInfoDrawerRef } from '../FarmInfoDrawer';
import { FishingShopDrawer, type FishingShopDrawerRef } from '../FishingShopDrawer';
import { FoodDishDrawer, type FoodDishDrawerRef } from '../FoodDishDrawer';
import { useGame } from '../GameProvider';
import { MailBoxDrawer, type MailBoxDrawerRef } from '../MailBoxDrawer';
import { SellBoxDrawer, type SellBoxDrawerRef } from '../SellBoxDrawer';
import { Shop, type ShopRef } from '../Shop';
import { SmeltingDrawer, type SmeltingDrawerRef } from '../SmeltingDrawer';
import type { PlacedItem } from '../types';
import { isMultiplayerScene } from '../types';
import { WellDrawer, type WellDrawerRef } from '../WellDrawer';
import { InteractionModal } from './InteractionModal';
import { SpiritSnatchMiniGame } from '../SpiritSnatchMiniGame';
import { useAuth } from '@/store/AuthProvider';
import { Backpack, type BackpackRef } from '../Backpack';
import { StorageDrawer, type StorageDrawerRef } from '../StorageDrawer';
import { MPBackpackDrawer, type MPBackpackDrawerRef } from '../multiplayer/MPBackpackDrawer';

export interface GameDrawersHandle {
  openShop: () => void;
  openFarmInfo: () => void;
  openBestiary: () => void;
  openEquip: () => void;
  openBackpack: () => void;
  /** Opens the growth/harvest sheet for a crop, or closes it when passed null. */
  showCropInfo: (crop: PlacedItem | null) => void;
}

/**
 * Every drawer, sheet and modal in the game, in one place.
 *
 * These read the game context directly instead of taking props so that
 * WorldRenderer's high-frequency local state — drag previews, camera snapshots,
 * bug positions — no longer reconciles fifteen drawer subtrees on every change.
 *
 * Drawers that open in response to an interaction wire themselves into the
 * action registry here; the rest are opened through the imperative handle.
 */
export const GameDrawers = forwardRef<GameDrawersHandle>(function GameDrawers(_props, ref) {
  const {
    itemDefs, inventory, storage, backpackSlots, gems, equipped, foodDishQueues,
    farm, farmLevel, farmLevels, quests, canUpgrade, activeHighlight, activeCategory,
    activeScene, pendingInteraction, clearInteraction,
    purchaseItem, sellItemsBatch, addToFoodDish, equipItem, setFarmName, completeQuest,
    depositToStorage, withdrawFromStorage, setCategory,
    showPetDialog, selectTile, refreshGame, emitQuestModalOpened,
    setShopOpen, setSellBoxOpen, setCookingOpen, setCraftingOpen, setFoodDishOpen, setEquipOpen,
    onShopCategorySelect, tryAutoAdvanceDialog,
    emitCook, cookResult, clearCookResult,
    emitCraft, craftResult, clearCraftResult,
    emitSmelt, smeltResult, clearSmeltResult,
    emitLearnRecipe, learnRecipeResult, clearLearnRecipeResult,
    emitCollectWater, collectWaterResult, clearCollectWaterResult,
    emitSpiritSnatchStart,
    emitSpiritSnatchSubmit,
    spiritSnatchRound,
  } = useGame();
  const { user } = useAuth();
  const petLevel = user?.totalLevel ?? user?.pet?.level ?? 0;
  const farmingSkillLevel = user?.skills?.farming?.level ?? 0;
  const isMP = isMultiplayerScene(activeScene);

  const shopRef = useRef<ShopRef>(null);
  const farmInfoRef = useRef<FarmInfoDrawerRef>(null);
  const bestiaryRef = useRef<BestiaryDrawerRef>(null);
  const cookingRef = useRef<CookingDrawerRef>(null);
  const craftingRef = useRef<CraftingDrawerRef>(null);
  const smeltingRef = useRef<SmeltingDrawerRef>(null);
  const wellRef = useRef<WellDrawerRef>(null);
  const fishingShopRef = useRef<FishingShopDrawerRef>(null);
  const mailBoxRef = useRef<MailBoxDrawerRef>(null);
  const sellBoxRef = useRef<SellBoxDrawerRef>(null);
  const foodDishRef = useRef<FoodDishDrawerRef>(null);
  const equipRef = useRef<EquipDrawerRef>(null);
  const cropInfoRef = useRef<CropInfoDrawerRef>(null);
  const backpackRef = useRef<BackpackRef>(null);
  const mpBackpackRef = useRef<MPBackpackDrawerRef>(null);
  const storageRef = useRef<StorageDrawerRef>(null);

  const [cropInfoTarget, setCropInfoTarget] = useState<PlacedItem | null>(null);

  useEffect(() => {
    if (cropInfoTarget) cropInfoRef.current?.open();
    else cropInfoRef.current?.close();
  }, [cropInfoTarget]);

  const handleOpenShop = useCallback(() => {
    emitQuestModalOpened('shop');
    setShopOpen(true);
    shopRef.current?.open();
  }, [setShopOpen, emitQuestModalOpened]);

  useImperativeHandle(ref, () => ({
    openShop: handleOpenShop,
    openFarmInfo: () => {
      farmInfoRef.current?.open();
    },
    openBestiary: () => {
      emitQuestModalOpened('bestiary');
      bestiaryRef.current?.open();
    },
    openEquip: () => {
      emitQuestModalOpened('equip');
      equipRef.current?.open();
    },
    openBackpack: () => {
      emitQuestModalOpened('backpack');
      if (isMP) mpBackpackRef.current?.open();
      else backpackRef.current?.open();
    },
    showCropInfo: setCropInfoTarget,
  }), [handleOpenShop, isMP, emitQuestModalOpened]);

  useEffect(() => {
    registerAction('cooking', ({ clearInteraction: clear }) => { cookingRef.current?.open(); clear(); });
    registerAction('crafting', ({ clearInteraction: clear }) => { craftingRef.current?.open(); clear(); });
    registerAction('smelting', ({ clearInteraction: clear }) => { smeltingRef.current?.open(); clear(); });
    registerAction('fishing_shop', ({ clearInteraction: clear }) => { fishingShopRef.current?.open(); clear(); });
    registerAction('sell_box', ({ clearInteraction: clear }) => { sellBoxRef.current?.open(); clear(); });
    registerAction('mail_box', ({ clearInteraction: clear }) => { mailBoxRef.current?.open(); clear(); });
    registerAction('storage', ({ clearInteraction: clear }) => { storageRef.current?.open(); clear(); });
    registerAction('food_dish', ({ action, clearInteraction: clear }) => {
      if (action.anchorId) foodDishRef.current?.open(action.anchorId);
      clear();
    });
    registerAction('spirit_snatch', ({ clearInteraction: clear }) => {
      emitSpiritSnatchStart();
      clear();
    });
  }, [emitSpiritSnatchStart]);

  useEffect(() => {
    if (!pendingInteraction || pendingInteraction.type === 'none') return;
    // Wells carry their anchor in the payload so each one keeps its own state.
    if (
      pendingInteraction.type === 'open_modal' &&
      typeof pendingInteraction.payload === 'string' &&
      pendingInteraction.payload.startsWith('well')
    ) {
      wellRef.current?.open(pendingInteraction.payload);
      clearInteraction();
      return;
    }
    executeAction(pendingInteraction, clearInteraction);
  }, [pendingInteraction, clearInteraction]);

  const handleCropHarvest = useCallback(
    (col: number, row: number) => selectTile(col, row),
    [selectTile],
  );
  const handleCropDismiss = useCallback(() => setCropInfoTarget(null), []);

  return (
    <>
      <Shop
        ref={shopRef}
        gems={gems}
        farmLevel={farmLevel}
        petLevel={petLevel}
        farmingSkillLevel={farmingSkillLevel}
        itemDefs={itemDefs}
        inventory={inventory}
        onPurchase={purchaseItem}
        activeHighlight={activeHighlight}
        onOpenChange={setShopOpen}
        onCategorySelect={onShopCategorySelect}
      />

      <FarmInfoDrawer
        ref={farmInfoRef}
        farm={farm}
        farmLevel={farmLevel}
        farmLevels={farmLevels}
        quests={quests}
        canUpgrade={canUpgrade}
        itemDefs={itemDefs}
        equipped={equipped}
        onRename={setFarmName}
        onCompleteQuest={completeQuest}
        onOpenChange={(open) => {
          if (!open) emitQuestModalOpened('farm_info');
        }}
      />

      <BestiaryDrawer ref={bestiaryRef} itemDefs={itemDefs} />

      <CookingDrawer
        ref={cookingRef}
        itemDefs={itemDefs}
        inventory={inventory}
        storage={storage}
        onCook={emitCook}
        onLearnRecipe={(itemType) => {
          emitLearnRecipe(itemType);
          tryAutoAdvanceDialog('learn', itemType);
        }}
        cookResult={cookResult}
        learnRecipeResult={learnRecipeResult}
        onResultDismiss={clearCookResult}
        onLearnResultDismiss={clearLearnRecipeResult}
        onOpenChange={(open) => {
          setCookingOpen(open);
          if (open) emitQuestModalOpened('cooking');
        }}
        tryAutoAdvanceDialog={tryAutoAdvanceDialog}
      />

      <SmeltingDrawer
        ref={smeltingRef}
        itemDefs={itemDefs}
        inventory={inventory}
        storage={storage}
        onSmelt={emitSmelt}
        smeltResult={smeltResult}
        onResultDismiss={clearSmeltResult}
        onOpenChange={(open) => {
          if (open) emitQuestModalOpened('smelting');
        }}
      />

      <CraftingDrawer
        ref={craftingRef}
        itemDefs={itemDefs}
        inventory={inventory}
        storage={storage}
        onCraft={emitCraft}
        onLearnRecipe={(itemType) => {
          emitLearnRecipe(itemType);
          tryAutoAdvanceDialog('learn', itemType);
        }}
        craftResult={craftResult}
        learnRecipeResult={learnRecipeResult}
        onResultDismiss={clearCraftResult}
        onLearnResultDismiss={clearLearnRecipeResult}
        tryAutoAdvanceDialog={tryAutoAdvanceDialog}
        activeHighlight={activeHighlight}
        onOpenChange={(open) => {
          setCraftingOpen(open);
          if (open) emitQuestModalOpened('crafting');
        }}
      />

      <MailBoxDrawer
        ref={mailBoxRef}
        itemDefs={itemDefs}
        inventory={inventory}
        onRefreshGame={refreshGame}
      />

      <SellBoxDrawer
        ref={sellBoxRef}
        itemDefs={itemDefs}
        inventory={inventory}
        onSellBatch={sellItemsBatch}
        onSellError={showPetDialog}
        activeHighlight={activeHighlight}
        onOpenChange={setSellBoxOpen}
        tryAutoAdvanceDialog={tryAutoAdvanceDialog}
      />

      <FoodDishDrawer
        ref={foodDishRef}
        itemDefs={itemDefs}
        inventory={inventory}
        farmLevel={farmLevel}
        foodDishQueues={foodDishQueues}
        onAddToDish={addToFoodDish}
        onError={showPetDialog}
        activeHighlight={activeHighlight}
        onOpenChange={setFoodDishOpen}
        tryAutoAdvanceDialog={tryAutoAdvanceDialog}
      />

      <WellDrawer
        ref={wellRef}
        onCollect={emitCollectWater}
        result={collectWaterResult}
        onResultDismiss={clearCollectWaterResult}
      />

      <FishingShopDrawer
        ref={fishingShopRef}
        gems={gems}
        farmLevel={farmLevel}
        petLevel={petLevel}
        itemDefs={itemDefs}
        inventory={inventory}
        onPurchase={purchaseItem}
      />

      <EquipDrawer
        ref={equipRef}
        equipped={equipped}
        inventory={inventory}
        itemDefs={itemDefs}
        onEquip={equipItem}
        activeHighlight={activeHighlight}
        onOpenChange={setEquipOpen}
        tryAutoAdvanceDialog={tryAutoAdvanceDialog}
      />

      <Backpack
        ref={backpackRef}
        inventory={inventory}
        activeCategory={activeCategory}
        itemDefs={itemDefs}
        backpackSlots={backpackSlots}
        onSetCategory={setCategory}
      />

      <MPBackpackDrawer
        ref={mpBackpackRef}
        inventory={inventory}
        itemDefs={itemDefs}
        backpackSlots={backpackSlots}
      />

      <StorageDrawer
        ref={storageRef}
        itemDefs={itemDefs}
        inventory={inventory}
        storage={storage}
        backpackSlots={backpackSlots}
        onDeposit={depositToStorage}
        onWithdraw={withdrawFromStorage}
        onError={showPetDialog}
      />

      <CropInfoDrawer
        ref={cropInfoRef}
        crop={cropInfoTarget}
        itemDefs={itemDefs}
        onHarvest={handleCropHarvest}
        onDismiss={handleCropDismiss}
      />

      {spiritSnatchRound && (
        <SpiritSnatchMiniGame
          round={spiritSnatchRound}
          treatImageUrl={itemDefs.candy_corn?.imageUrl ?? itemDefs.decoration_cute_lawn_ghost?.imageUrl}
          trickImageUrl={itemDefs.bone_spider?.imageUrl ?? itemDefs.ghost_in_a_jar?.imageUrl}
          onComplete={(taps) => {
            emitSpiritSnatchSubmit(spiritSnatchRound.roundId, taps);
          }}
          onCancel={() => {
            emitSpiritSnatchSubmit(spiritSnatchRound.roundId, []);
          }}
        />
      )}

      {pendingInteraction?.type === 'open_modal' && pendingInteraction.payload && (
        <InteractionModal payload={pendingInteraction.payload} onClose={clearInteraction} />
      )}
    </>
  );
});
