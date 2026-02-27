/**
 * Requirements: items, buildings, actions, equips, talk_to_npc, crop_grown, open_modal.
 * Each list has Add opening a drawer.
 */

import React from 'react';
import { View } from 'react-native';
import { ListItemChip } from '../ListItemChip';
import { AddButton } from '../AddButton';
import type { FormState, ItemReq, BuildingReq, ActionReq, EquipReq, TalkToNpcReq, CropGrownReq, OpenModalReq } from '../types';

interface RequirementsSectionProps {
  form: FormState;
  updateForm: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onAddItem: () => void;
  onEditItem: (index: number) => void;
  onAddBuilding: () => void;
  onEditBuilding: (index: number) => void;
  onAddAction: () => void;
  onEditAction: (index: number) => void;
  onAddEquip: () => void;
  onEditEquip: (index: number) => void;
  onAddTalkToNpc: () => void;
  onEditTalkToNpc: (index: number) => void;
  onAddCropGrown: () => void;
  onEditCropGrown: (index: number) => void;
  onAddOpenModal: () => void;
  onEditOpenModal: (index: number) => void;
}

function ReqSubsection({
  label,
  items,
  renderLabel,
  onAdd,
  onEdit,
  onDelete,
}: {
  label: string;
  items: unknown[];
  renderLabel: (item: unknown, i: number) => string;
  onAdd: () => void;
  onEdit: (i: number) => void;
  onDelete: (i: number) => void;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      {items.length > 0 && (
        <View style={{ marginBottom: 8 }}>
          {items.map((item, i) => (
            <View key={i} style={{ marginBottom: 6 }}>
              <ListItemChip
                title={renderLabel(item, i)}
                onEdit={() => onEdit(i)}
                onDelete={() => onDelete(i)}
              />
            </View>
          ))}
        </View>
      )}
      <AddButton label={label} onPress={onAdd} />
    </View>
  );
}

export function RequirementsSection(props: RequirementsSectionProps) {
  const { form, updateForm } = props;

  return (
    <View style={{ gap: 4 }}>
      <ReqSubsection
        label="Add Item Requirement"
        items={form.reqItems}
        renderLabel={(r) => `${(r as ItemReq).itemType} × ${(r as ItemReq).qty}`}
        onAdd={props.onAddItem}
        onEdit={props.onEditItem}
        onDelete={(i) => updateForm('reqItems', form.reqItems.filter((_, j) => j !== i))}
      />
      <ReqSubsection
        label="Add Building Requirement"
        items={form.reqBuildings}
        renderLabel={(r) => `${(r as BuildingReq).itemType} × ${(r as BuildingReq).count}`}
        onAdd={props.onAddBuilding}
        onEdit={props.onEditBuilding}
        onDelete={(i) => updateForm('reqBuildings', form.reqBuildings.filter((_, j) => j !== i))}
      />
      <ReqSubsection
        label="Add Action Requirement"
        items={form.reqActions}
        renderLabel={(r) => {
          const a = r as ActionReq;
          return `${a.action} × ${a.count}${a.itemType ? ` (${a.itemType})` : ''}`;
        }}
        onAdd={props.onAddAction}
        onEdit={props.onEditAction}
        onDelete={(i) => updateForm('reqActions', form.reqActions.filter((_, j) => j !== i))}
      />
      <ReqSubsection
        label="Add Equip Requirement"
        items={form.reqEquips}
        renderLabel={(r) => `${(r as EquipReq).slot}: ${(r as EquipReq).itemType || '…'}`}
        onAdd={props.onAddEquip}
        onEdit={props.onEditEquip}
        onDelete={(i) => updateForm('reqEquips', form.reqEquips.filter((_, j) => j !== i))}
      />
      <ReqSubsection
        label="Add Talk to NPC"
        items={form.reqTalkToNpc}
        renderLabel={(r) => `${(r as TalkToNpcReq).npcItemType} × ${(r as TalkToNpcReq).count}`}
        onAdd={props.onAddTalkToNpc}
        onEdit={props.onEditTalkToNpc}
        onDelete={(i) => updateForm('reqTalkToNpc', form.reqTalkToNpc.filter((_, j) => j !== i))}
      />
      <ReqSubsection
        label="Add Crop Grown"
        items={form.reqCropGrown}
        renderLabel={(r) => `${(r as CropGrownReq).itemType} × ${(r as CropGrownReq).count}`}
        onAdd={props.onAddCropGrown}
        onEdit={props.onEditCropGrown}
        onDelete={(i) => updateForm('reqCropGrown', form.reqCropGrown.filter((_, j) => j !== i))}
      />
      <ReqSubsection
        label="Add Open Modal"
        items={form.reqOpenModal}
        renderLabel={(r) => `${(r as OpenModalReq).payload} × ${(r as OpenModalReq).count}`}
        onAdd={props.onAddOpenModal}
        onEdit={props.onEditOpenModal}
        onDelete={(i) => updateForm('reqOpenModal', form.reqOpenModal.filter((_, j) => j !== i))}
      />
    </View>
  );
}
