<template>
  <div v-if="query" class="root full-height q-py-md" data-testid="AudioInfo">
    <div v-if="enablePreset" class="q-px-md">
      <div class="row items-center no-wrap q-mb-xs">
        <div class="text-body1">プリセット</div>
        <q-btn dense flat icon="more_vert" :disable="uiLocked">
          <q-menu transition-duration="100">
            <q-list>
              <q-item
                v-close-popup
                clickable
                @click="registerPreset({ overwrite: false })"
              >
                <q-item-section avatar>
                  <q-avatar
                    icon="add_circle_outline"
                    color="primary"
                    text-color="display-on-primary"
                  ></q-avatar>
                </q-item-section>
                <q-item-section>
                  <q-item-label>プリセット新規登録</q-item-label>
                </q-item-section>
              </q-item>
              <q-item
                v-close-popup
                clickable
                @click="showsPresetEditDialog = true"
              >
                <q-item-section avatar>
                  <q-avatar
                    icon="edit_note"
                    color="primary"
                    text-color="display-on-primary"
                  ></q-avatar>
                </q-item-section>
                <q-item-section>
                  <q-item-label>プリセット管理</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </div>

      <div class="full-width row" @wheel="setPresetByScroll($event)">
        <!-- TODO: 同じプリセットを選択したときにも複数選択中の他のAudioItemのプリセットを変更するようにする -->
        <q-select
          v-model="presetSelectModel"
          :options="selectablePresetList"
          class="col overflow-hidden"
          color="primary"
          text-color="display-on-primary"
          outlined
          dense
          transition-show="none"
          transition-hide="none"
          :disable="uiLocked"
        >
          <template #selected-item="scope">
            <div class="preset-select-label">
              {{ scope.opt.label }}
            </div>
          </template>
          <template #no-option>
            <q-item>
              <q-item-section class="text-grey">
                プリセットはありません
              </q-item-section>
            </q-item>
          </template>
        </q-select>

        <q-btn
          v-show="!isRegisteredPreset || isChangedPreset"
          dense
          outline
          class="col-auto q-ml-xs"
          size="sm"
          text-color="display"
          :label="isRegisteredPreset ? '再登録' : '登録'"
          @click="registerPreset({ overwrite: isRegisteredPreset })"
        />
      </div>
      <!-- プリセット管理ダイアログ -->
      <preset-manage-dialog v-model:open-dialog="showsPresetEditDialog" />

      <!-- プリセット登録ダイアログ -->
      <q-dialog v-model="showsPresetNameDialog" @before-hide="closeAllDialog">
        <q-card style="min-width: 350px">
          <q-card-section>
            <div class="text-h6">プリセット登録</div>
          </q-card-section>

          <q-form @submit.prevent="checkRewritePreset">
            <q-card-section class="q-pt-none">
              <q-select
                fill-input
                autofocus
                hide-selected
                label="タイトル"
                color="primary"
                use-input
                input-debounce="0"
                :model-value="presetName"
                :options="presetOptionsList"
                @input-value="setPresetName"
                @filter="filterPresetOptionsList"
              />
            </q-card-section>

            <q-card-actions align="right">
              <q-btn
                v-close-popup
                flat
                label="キャンセル"
                @click="closeAllDialog"
              />
              <q-btn flat type="submit" label="確定" />
            </q-card-actions>
          </q-form>
        </q-card>
      </q-dialog>

      <!-- プリセット再登録ダイアログ -->
      <q-dialog
        v-model="showsPresetRewriteDialog"
        @before-hide="closeAllDialog"
      >
        <q-card>
          <q-card-section>
            <div class="text-h6">プリセットの再登録</div>
          </q-card-section>
          <q-card-section>
            <q-list>
              <q-item clickable class="no-margin" @click="updatePreset(true)">
                <q-item-section avatar>
                  <q-avatar icon="arrow_forward" text-color="blue" />
                </q-item-section>
                <q-item-section>
                  プリセットを再登録し、このプリセットが設定されたテキスト欄全てに再適用する
                </q-item-section>
              </q-item>
              <q-item clickable class="no-margin" @click="updatePreset(false)">
                <q-item-section avatar>
                  <q-avatar icon="arrow_forward" text-color="blue" />
                </q-item-section>
                <q-item-section> プリセットの再登録のみ行う </q-item-section>
              </q-item>
              <q-item
                v-close-popup
                clickable
                class="no-margin"
                @click="closeAllDialog"
              >
                <q-item-section avatar>
                  <q-avatar icon="arrow_forward" text-color="blue" />
                </q-item-section>
                <q-item-section>キャンセル</q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </q-dialog>

      <q-separator class="q-mt-md" />
    </div>

    <div class="parameters q-px-md">
      <div v-for="parameter in parameters" :key="parameter.label">
        <q-input
          dense
          borderless
          maxlength="5"
          :class="{
            disabled: parameter.slider.qSliderProps.disable.value,
          }"
          :disable="parameter.slider.qSliderProps.disable.value"
          :model-value="
            parameter.slider.state.currentValue.value != undefined
              ? parameter.slider.state.currentValue.value.toFixed(2)
              : parameter.slider.qSliderProps.min.value.toFixed(2)
          "
          @change="handleParameterChange(parameter, $event)"
        >
          <template #before
            ><span class="text-body1 text-display">{{
              parameter.label
            }}</span></template
          >
        </q-input>
        <q-slider
          dense
          snap
          color="primary"
          track-size="2px"
          :min="parameter.slider.qSliderProps.min.value"
          :max="parameter.slider.qSliderProps.max.value"
          :step="parameter.slider.qSliderProps.step.value"
          :disable="parameter.slider.qSliderProps.disable.value"
          :model-value="parameter.slider.qSliderProps.modelValue.value"
          @update:model-value="
            parameter.slider.qSliderProps['onUpdate:modelValue']
          "
          @change="handleParameterChange(parameter, $event)"
          @wheel="parameter.slider.qSliderProps.onWheel"
          @pan="parameter.slider.qSliderProps.onPan"
        />
      </div>
    </div>
    <div
      v-if="shouldShowMorphing"
      class="q-px-md"
      :class="{
        disabled: uiLocked,
      }"
    >
      <q-separator class="q-my-md" />
      <span class="text-body1 q-mb-xs">モーフィング</span>
      <div class="row no-wrap items-center">
        <character-button
          v-model:selected-voice="morphingTargetVoice"
          class="q-my-xs"
          :character-infos="morphingTargetCharacters"
          :show-engine-info="morphingTargetEngines.length >= 2"
          :emptiable="true"
          :ui-locked="uiLocked"
        />
        <div class="q-pl-xs row overflow-hidden">
          <div class="text-body2 ellipsis overflow-hidden">
            {{
              morphingTargetCharacterInfo
                ? morphingTargetCharacterInfo.metas.speakerName
                : "未設定"
            }}
          </div>
          <!-- 横幅が狭い場合に改行させるため分割 -->
          <div
            v-if="
              morphingTargetCharacterInfo &&
              morphingTargetCharacterInfo.metas.styles.length >= 2
            "
            class="text-body2 ellipsis overflow-hidden"
          >
            （{{
              morphingTargetStyleInfo
                ? morphingTargetStyleInfo.styleName
                : undefined
            }}）
          </div>
        </div>
      </div>
      <div
        v-if="!isSupportedMorphing"
        class="text-warning"
        style="font-size: 0.7rem"
      >
        非対応エンジンです
      </div>
      <div
        v-else-if="morphingTargetVoice && !isValidMorphingInfo"
        class="text-warning"
        style="font-size: 0.7rem"
      >
        無効な設定です
      </div>
      <div :class="{ disabled: morphingTargetStyleInfo == undefined }">
        <span class="text-body1 q-mb-xs"
          >割合
          {{
            morphingRateSlider.state.currentValue.value != undefined
              ? morphingRateSlider.state.currentValue.value.toFixed(2)
              : undefined
          }}</span
        >
        <q-slider
          dense
          snap
          color="primary"
          track-size="2px"
          :min="morphingRateSlider.qSliderProps.min.value"
          :max="morphingRateSlider.qSliderProps.max.value"
          :step="morphingRateSlider.qSliderProps.step.value"
          :disable="
            morphingRateSlider.qSliderProps.disable.value ||
            morphingTargetStyleInfo == undefined
          "
          :model-value="morphingRateSlider.qSliderProps.modelValue.value"
          @update:model-value="
            morphingRateSlider.qSliderProps['onUpdate:modelValue']
          "
          @change="morphingRateSlider.qSliderProps.onChange"
          @wheel="morphingRateSlider.qSliderProps.onWheel"
          @pan="morphingRateSlider.qSliderProps.onPan"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watchEffect } from "vue";
import { QSelectProps } from "quasar";
import CharacterButton from "./CharacterButton.vue";
import PresetManageDialog from "./PresetManageDialog.vue";
import { useStore } from "@/store";

import {
  AudioKey,
  CharacterInfo,
  MorphingInfo,
  Preset,
  PresetKey,
  Voice,
} from "@/type/preload";
import {
  PreviewSliderHelper,
  previewSliderHelper,
} from "@/helpers/previewSliderHelper";
import { EngineManifest } from "@/openapi";
import { useDefaultPreset } from "@/composables/useDefaultPreset";
import { SLIDER_PARAMETERS } from "@/store/utility";

const props =
  defineProps<{
    activeAudioKey: AudioKey;
  }>();

const store = useStore();

// accent phrase
const uiLocked = computed(() => store.getters.UI_LOCKED);

const audioItem = computed(() => store.state.audioItems[props.activeAudioKey]);
const query = computed(() => audioItem.value?.query);

const supportedFeatures = computed(
  () =>
    (store.state.engineIds.some(
      (id) => id === audioItem.value.voice.engineId
    ) &&
      store.state.engineManifests[audioItem.value.voice.engineId]
        .supportedFeatures) as EngineManifest["supportedFeatures"] | undefined
);

// FIXME: slider.onChangeとhandleParameterChangeでstate変更が２経路になっているので統一する
type Parameter = {
  label: string;
  slider: PreviewSliderHelper;
  action: Parameters<typeof store.dispatch>[0]["type"];
  key: keyof Omit<Preset, "name" | "morphingInfo">;
};
const selectedAudioKeys = computed(() =>
  store.state.experimentalSetting.enableMultiSelect
    ? store.getters.SELECTED_AUDIO_KEYS
    : [props.activeAudioKey]
);
const parameters = computed<Parameter[]>(() => [
  {
    label: "話速",
    slider: previewSliderHelper({
      modelValue: () => query.value?.speedScale ?? null,
      disable: () =>
        uiLocked.value || supportedFeatures.value?.adjustSpeedScale === false,
      max: SLIDER_PARAMETERS.SPEED.max,
      min: SLIDER_PARAMETERS.SPEED.min,
      step: SLIDER_PARAMETERS.SPEED.step,
      scrollStep: SLIDER_PARAMETERS.SPEED.scrollStep,
      scrollMinStep: SLIDER_PARAMETERS.SPEED.scrollMinStep,
      onChange: (speedScale: number) =>
        store.dispatch("COMMAND_MULTI_SET_AUDIO_SPEED_SCALE", {
          audioKeys: selectedAudioKeys.value,
          speedScale,
        }),
    }),
    action: "COMMAND_MULTI_SET_AUDIO_SPEED_SCALE",
    key: "speedScale",
  },
  {
    label: "音高",
    slider: previewSliderHelper({
      modelValue: () => query.value?.pitchScale ?? null,
      disable: () =>
        uiLocked.value || supportedFeatures.value?.adjustPitchScale === false,
      max: SLIDER_PARAMETERS.PITCH.max,
      min: SLIDER_PARAMETERS.PITCH.min,
      step: SLIDER_PARAMETERS.PITCH.step,
      scrollStep: SLIDER_PARAMETERS.PITCH.scrollStep,
      onChange: (pitchScale: number) =>
        store.dispatch("COMMAND_MULTI_SET_AUDIO_PITCH_SCALE", {
          audioKeys: selectedAudioKeys.value,
          pitchScale,
        }),
    }),
    action: "COMMAND_MULTI_SET_AUDIO_PITCH_SCALE",
    key: "pitchScale",
  },
  {
    label: "抑揚",
    slider: previewSliderHelper({
      modelValue: () => query.value?.intonationScale ?? null,
      disable: () =>
        uiLocked.value ||
        supportedFeatures.value?.adjustIntonationScale === false,
      max: SLIDER_PARAMETERS.INTONATION.max,
      min: SLIDER_PARAMETERS.INTONATION.min,
      step: SLIDER_PARAMETERS.INTONATION.step,
      scrollStep: SLIDER_PARAMETERS.INTONATION.scrollStep,
      scrollMinStep: SLIDER_PARAMETERS.INTONATION.scrollMinStep,
      onChange: (intonationScale: number) =>
        store.dispatch("COMMAND_MULTI_SET_AUDIO_INTONATION_SCALE", {
          audioKeys: selectedAudioKeys.value,
          intonationScale,
        }),
    }),
    action: "COMMAND_MULTI_SET_AUDIO_INTONATION_SCALE",
    key: "intonationScale",
  },
  {
    label: "音量",
    slider: previewSliderHelper({
      modelValue: () => query.value?.volumeScale ?? null,
      disable: () =>
        uiLocked.value || supportedFeatures.value?.adjustVolumeScale === false,
      max: SLIDER_PARAMETERS.VOLUME.max,
      min: SLIDER_PARAMETERS.VOLUME.min,
      step: SLIDER_PARAMETERS.VOLUME.step,
      scrollStep: SLIDER_PARAMETERS.VOLUME.scrollStep,
      scrollMinStep: SLIDER_PARAMETERS.VOLUME.scrollMinStep,
      onChange: (volumeScale: number) =>
        store.dispatch("COMMAND_MULTI_SET_AUDIO_VOLUME_SCALE", {
          audioKeys: selectedAudioKeys.value,
          volumeScale,
        }),
    }),
    action: "COMMAND_MULTI_SET_AUDIO_VOLUME_SCALE",
    key: "volumeScale",
  },
  {
    label: "開始無音",
    slider: previewSliderHelper({
      modelValue: () => query.value?.prePhonemeLength ?? null,
      disable: () => uiLocked.value,
      max: SLIDER_PARAMETERS.PRE_PHONEME_LENGTH.max,
      min: SLIDER_PARAMETERS.PRE_PHONEME_LENGTH.min,
      step: SLIDER_PARAMETERS.PRE_PHONEME_LENGTH.step,
      scrollStep: SLIDER_PARAMETERS.PRE_PHONEME_LENGTH.scrollStep,
      scrollMinStep: SLIDER_PARAMETERS.PRE_PHONEME_LENGTH.scrollMinStep,
      onChange: (prePhonemeLength: number) =>
        store.dispatch("COMMAND_MULTI_SET_AUDIO_PRE_PHONEME_LENGTH", {
          audioKeys: selectedAudioKeys.value,
          prePhonemeLength,
        }),
    }),
    action: "COMMAND_MULTI_SET_AUDIO_PRE_PHONEME_LENGTH",
    key: "prePhonemeLength",
  },
  {
    label: "終了無音",
    slider: previewSliderHelper({
      modelValue: () => query.value?.postPhonemeLength ?? null,
      disable: () => uiLocked.value,
      max: SLIDER_PARAMETERS.POST_PHONEME_LENGTH.max,
      min: SLIDER_PARAMETERS.POST_PHONEME_LENGTH.min,
      step: SLIDER_PARAMETERS.POST_PHONEME_LENGTH.step,
      scrollStep: SLIDER_PARAMETERS.POST_PHONEME_LENGTH.scrollStep,
      scrollMinStep: SLIDER_PARAMETERS.POST_PHONEME_LENGTH.scrollMinStep,
      onChange: (postPhonemeLength: number) =>
        store.dispatch("COMMAND_MULTI_SET_AUDIO_POST_PHONEME_LENGTH", {
          audioKeys: selectedAudioKeys.value,
          postPhonemeLength,
        }),
    }),
    action: "COMMAND_MULTI_SET_AUDIO_POST_PHONEME_LENGTH",
    key: "postPhonemeLength",
  },
]);
const handleParameterChange = (
  parameter: Parameter,
  inputValue: string | number | null
) => {
  if (inputValue == null) throw new Error("inputValue is null");
  const value = adjustSliderValue(
    parameter.label + "入力",
    inputValue.toString(),
    parameter.slider.qSliderProps.min.value,
    parameter.slider.qSliderProps.max.value
  );
  store.dispatch(parameter.action, {
    audioKeys: selectedAudioKeys.value,
    [parameter.key]: value,
  });
};

// モーフィング
const shouldShowMorphing = computed(
  () => store.state.experimentalSetting.enableMorphing
);

const isSupportedMorphing = computed(
  () => supportedFeatures.value?.synthesisMorphing
);

const isValidMorphingInfo = computed(() =>
  store.getters.VALID_MORPHING_INFO(audioItem.value)
);

const morphingTargetEngines = store.getters.MORPHING_SUPPORTED_ENGINES;

// モーフィング可能なターゲット一覧を取得
watchEffect(() => {
  if (audioItem.value != undefined) {
    store.dispatch("LOAD_MORPHABLE_TARGETS", {
      engineId: audioItem.value.voice.engineId,
      baseStyleId: audioItem.value.voice.styleId,
    });
  }
});

const morphingTargetCharacters = computed<CharacterInfo[]>(() => {
  const allCharacterInfos = store.getters.USER_ORDERED_CHARACTER_INFOS;
  if (allCharacterInfos == undefined)
    throw new Error("USER_ORDERED_CHARACTER_INFOS == undefined");

  const baseEngineId = audioItem.value.voice.engineId;
  const baseStyleId = audioItem.value.voice.styleId;

  // モーフィング対象リストを問い合わせていないときはとりあえず空欄を表示
  // FIXME: そもそもモーフィングUIを表示しないようにする
  const morphableTargets =
    store.state.morphableTargetsInfo[baseEngineId]?.[baseStyleId] ?? {};

  const morphableStyleIds = Object.entries(morphableTargets) // FIXME: Voiceにするべき
    .filter(([, value]) => value.isMorphable)
    .map(([styleId]) => parseInt(styleId));

  const characterInfos: CharacterInfo[] = allCharacterInfos
    // モーフィング可能なスタイルのみを残す
    .map((character) => {
      const styles = character.metas.styles.filter(
        (style) =>
          morphableStyleIds.includes(style.styleId) &&
          style.engineId == baseEngineId
      );
      return {
        ...character,
        metas: {
          ...character.metas,
          styles,
        },
      };
    })
    // スタイルが１つもないキャラクターは省く
    .filter((characters) => characters.metas.styles.length >= 1);

  // 選択中のキャラがいない場合は一番上に追加する
  if (
    morphingTargetVoice.value != undefined &&
    !characterInfos.some(
      (info) => info.metas.speakerUuid == morphingTargetVoice.value?.speakerId
    )
  ) {
    const info = allCharacterInfos.find(
      (info) => info.metas.speakerUuid == morphingTargetVoice.value?.speakerId
    );
    if (info == undefined) throw new Error("info == undefined");
    characterInfos.unshift(info);
  }

  return characterInfos;
});

const morphingTargetVoice = computed({
  get() {
    const morphingInfo = audioItem.value.morphingInfo;
    if (morphingInfo == undefined) return undefined;
    return {
      engineId: morphingInfo.targetEngineId,
      speakerId: morphingInfo.targetSpeakerId,
      styleId: morphingInfo.targetStyleId,
    };
  },
  set(voice: Voice | undefined) {
    const morphingInfo =
      voice != undefined
        ? {
            rate: audioItem.value.morphingInfo?.rate ?? 0.5,
            targetEngineId: voice.engineId,
            targetSpeakerId: voice.speakerId,
            targetStyleId: voice.styleId,
          }
        : undefined;
    store.dispatch("COMMAND_MULTI_SET_MORPHING_INFO", {
      audioKeys: selectedAudioKeys.value,
      morphingInfo,
    });
  },
});

const morphingTargetCharacterInfo = computed(() =>
  store.getters.USER_ORDERED_CHARACTER_INFOS?.find(
    (character) =>
      character.metas.speakerUuid === morphingTargetVoice.value?.speakerId
  )
);

const morphingTargetStyleInfo = computed(() => {
  const targetVoice = morphingTargetVoice.value;
  return morphingTargetCharacterInfo.value?.metas.styles.find(
    (style) =>
      style.engineId === targetVoice?.engineId &&
      style.styleId === targetVoice.styleId
  );
});

const setMorphingRate = (rate: number) => {
  const info = audioItem.value.morphingInfo;
  if (info == undefined) {
    throw new Error("audioItem.value.morphingInfo == undefined");
  }
  return store.dispatch("COMMAND_MULTI_SET_MORPHING_INFO", {
    audioKeys: selectedAudioKeys.value,
    morphingInfo: {
      rate,
      targetEngineId: info.targetEngineId,
      targetSpeakerId: info.targetSpeakerId,
      targetStyleId: info.targetStyleId,
    },
  });
};
const morphingRateSlider = previewSliderHelper({
  modelValue: () => audioItem.value.morphingInfo?.rate ?? null,
  disable: () => uiLocked.value,
  onChange: setMorphingRate,
  max: SLIDER_PARAMETERS.MORPHING_RATE.max,
  min: SLIDER_PARAMETERS.MORPHING_RATE.min,
  step: SLIDER_PARAMETERS.MORPHING_RATE.step,
  scrollStep: SLIDER_PARAMETERS.MORPHING_RATE.scrollStep,
  scrollMinStep: SLIDER_PARAMETERS.MORPHING_RATE.scrollMinStep,
});

// プリセット
const enablePreset = computed(
  () => store.state.experimentalSetting.enablePreset
);

const presetItems = computed(() => store.state.presetItems);
const presetKeys = computed(() => store.state.presetKeys);
const audioPresetKey = computed(() => audioItem.value?.presetKey);
const isRegisteredPreset = computed(
  () =>
    audioPresetKey.value != undefined &&
    presetItems.value[audioPresetKey.value] != undefined
);

const { isDefaultPresetKey, getDefaultPresetKeyForVoice } = useDefaultPreset();

const currentDefaultPresetKey = computed(() =>
  getDefaultPresetKeyForVoice(audioItem.value.voice)
);

// 入力パラメータがプリセットから変更されたか
const isChangedPreset = computed(() => {
  if (!isRegisteredPreset.value) return false;

  // プリセットの値を取得
  if (audioPresetKey.value == undefined)
    throw new Error("audioPresetKey is undefined"); // 次のコードが何故かコンパイルエラーになるチェック
  const preset = presetItems.value[audioPresetKey.value];
  const { name: _, morphingInfo, ...presetParts } = preset;

  // 入力パラメータと比較
  const keys = Object.keys(presetParts) as (keyof Omit<
    Preset,
    "name" | "morphingInfo"
  >)[];
  if (
    keys.some((key) => presetParts[key] !== presetPartsFromParameter.value[key])
  )
    return true;
  const morphingInfoFromParameter = presetPartsFromParameter.value.morphingInfo;
  if (morphingInfo && morphingInfoFromParameter) {
    const morphingInfoKeys = Object.keys(
      morphingInfo
    ) as (keyof MorphingInfo)[];
    return morphingInfoKeys.some(
      (key) => morphingInfo[key] !== morphingInfoFromParameter[key]
    );
  }
  return morphingInfo != morphingInfoFromParameter;
});

type PresetSelectModelType = {
  label: string;
  key: PresetKey | undefined;
};

// プリセットの変更
const changePreset = (presetKey: PresetKey | undefined) =>
  store.dispatch("COMMAND_MULTI_SET_AUDIO_PRESET", {
    audioKeys: selectedAudioKeys.value,
    presetKey,
  });

const presetList = computed<{ label: string; key: PresetKey }[]>(() =>
  presetKeys.value
    .filter((key) => presetItems.value[key] != undefined)
    .map((key) => ({
      key,
      label: presetItems.value[key].name,
    }))
);

// セルへのプリセットの設定
const selectablePresetList = computed<PresetSelectModelType[]>(() => {
  const topPresetList: { key: PresetKey | undefined; label: string }[] = [];

  if (isRegisteredPreset.value) {
    topPresetList.push({
      key: undefined,
      label: "プリセット解除",
    });
  }

  // 選択中のstyleのデフォルトプリセットは常に一番上
  topPresetList.push(
    ...presetList.value.filter(
      (preset) => preset.key === currentDefaultPresetKey.value
    )
  );
  // 他のstyleのデフォルトプリセットを除外
  const commonPresets = presetList.value.filter(
    (preset) => !isDefaultPresetKey(preset.key)
  );

  return [...topPresetList, ...commonPresets];
});

const presetSelectModel = computed<PresetSelectModelType>({
  get: () => {
    if (!isRegisteredPreset.value)
      return {
        label: "プリセット選択",
        key: undefined,
      };
    if (audioPresetKey.value == undefined)
      throw new Error("audioPresetKey is undefined"); // 次のコードが何故かコンパイルエラーになるチェック

    return {
      label: presetItems.value[audioPresetKey.value].name,
      key: audioPresetKey.value,
    };
  },
  set: (newVal) => {
    changePreset(newVal.key);
  },
});

const setPresetByScroll = (event: WheelEvent) => {
  event.preventDefault();

  const presetNumber = selectablePresetList.value.length;
  if (presetNumber === 0 || presetNumber == undefined) return;

  const nowIndex = selectablePresetList.value.findIndex(
    (value) => value.key == presetSelectModel.value.key
  );

  const isUp = event.deltaY > 0;
  const newIndex = isUp ? nowIndex + 1 : nowIndex - 1;
  if (newIndex < 0 || presetNumber <= newIndex) return;

  if (selectablePresetList.value[newIndex] == undefined) return;

  changePreset(selectablePresetList.value[newIndex].key);
};

// プリセットの登録・再登録
const showsPresetNameDialog = ref(false);
const showsPresetRewriteDialog = ref(false);
const presetName = ref("");

const setPresetName = (name: string) => {
  presetName.value = name;
};

const closeAllDialog = () => {
  presetName.value = "";
  showsPresetNameDialog.value = false;
  showsPresetRewriteDialog.value = false;
};

// プリセットの登録
const registerPreset = ({ overwrite }: { overwrite: boolean }) => {
  // 既存の場合は名前をセット
  if (isRegisteredPreset.value) {
    if (audioPresetKey.value == undefined)
      throw new Error("audioPresetKey is undefined"); // 次のコードが何故かコンパイルエラーになるチェック
    presetName.value = presetItems.value[audioPresetKey.value].name;
  }

  // 既存で再登録する場合は再登録ダイアログを表示
  if (isRegisteredPreset.value && overwrite) {
    showsPresetRewriteDialog.value = true;
    return;
  }

  // それ以外はダイアログを表示
  showsPresetNameDialog.value = true;
};

const presetOptionsList = ref<string[]>([]);
const filterPresetOptionsList: QSelectProps["onFilter"] = (
  inputValue,
  doneFn
) => {
  const presetNames = presetKeys.value
    .filter((presetKey) => !isDefaultPresetKey(presetKey))
    .map((presetKey) => presetItems.value[presetKey]?.name)
    .filter((value) => value != undefined);
  doneFn(() => {
    presetOptionsList.value = presetNames.filter((name) =>
      name.startsWith(inputValue)
    );
  });
};

const checkRewritePreset = async () => {
  if (presetList.value.find((e) => e.label === presetName.value)) {
    showsPresetRewriteDialog.value = true;
  } else {
    const audioPresetKey = await addPreset();
    changePreset(audioPresetKey);
  }
};

// 入力パラメータから、name以外のPresetを取得
const presetPartsFromParameter = computed<Omit<Preset, "name">>(() => {
  if (
    parameters.value.some(
      (parameter) => parameter.slider.state.currentValue.value == undefined
    )
  )
    throw new Error("slider value is null");

  return {
    ...parameters.value.reduce(
      (acc, parameter) => ({
        ...acc,
        [parameter.key]: parameter.slider.state.currentValue.value,
      }),
      {} as {
        [K in typeof parameters.value[number]["key"]]: number;
      }
    ),
    morphingInfo:
      morphingTargetStyleInfo.value &&
      morphingTargetCharacterInfo.value &&
      morphingRateSlider.state.currentValue.value != undefined // FIXME: ifでチェックしてthrowする
        ? {
            rate: morphingRateSlider.state.currentValue.value,
            targetEngineId: morphingTargetStyleInfo.value.engineId,
            targetSpeakerId:
              morphingTargetCharacterInfo.value.metas.speakerUuid,
            targetStyleId: morphingTargetStyleInfo.value.styleId,
          }
        : undefined,
  };
});

const createPresetData = (name: string): Preset => {
  return { name, ...presetPartsFromParameter.value };
};

// プリセット新規追加
const addPreset = () => {
  const name = presetName.value;
  const newPreset = createPresetData(name);
  if (newPreset == undefined) throw Error("newPreset == undefined");

  closeAllDialog();

  return store.dispatch("ADD_PRESET", {
    presetData: newPreset,
  });
};

const updatePreset = async (fullApply: boolean) => {
  const key = presetList.value.find(
    (preset) => preset.label === presetName.value
  )?.key;
  if (key == undefined) return;

  const title = presetName.value;
  const newPreset = createPresetData(title);
  if (newPreset == undefined) return;

  await store.dispatch("UPDATE_PRESET", {
    presetData: newPreset,
    presetKey: key,
  });

  if (fullApply) {
    await store.dispatch("COMMAND_FULLY_APPLY_AUDIO_PRESET", {
      presetKey: key,
    });
  }

  closeAllDialog();
};

// プリセットの編集
const showsPresetEditDialog = ref(false);

const adjustSliderValue = (
  inputItemName: string,
  inputStr: string,
  minimalVal: number,
  maximamVal: number
) => {
  const inputNum = Number(inputStr);

  store.dispatch("LOG_INFO", `${inputItemName}:${inputStr}`);

  if (isNaN(inputNum)) {
    return minimalVal;
  }
  if (inputNum < minimalVal) {
    return minimalVal;
  }
  if (maximamVal < inputNum) {
    return maximamVal;
  }

  return inputNum;
};
</script>

<style scoped lang="scss">
.root {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  gap: 0px 0;
  overflow-y: scroll;
}

.parameters {
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

.preset-select-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: fit-content;
}
</style>
