/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import semver from "semver";

import { AccentPhrase } from "@/openapi";
import { EngineId, StyleId, TrackId, Voice } from "@/type/preload";
import {
  DEFAULT_BEAT_TYPE,
  DEFAULT_BEATS,
  DEFAULT_BPM,
  DEFAULT_TPQN,
  DEFAULT_TRACK_NAME,
} from "@/sing/domain";
import { uuid4 } from "@/helpers/random";
import { projectFileSchema } from "@/infrastructures/projectFile/schema";
import { ProjectFileFormatError } from "@/infrastructures/projectFile/type";
import { validateTalkProject } from "@/infrastructures/projectFile/validation";

const DEFAULT_SAMPLING_RATE = 24000;

/**
 * プロジェクトファイルのマイグレーション
 */
export const migrateProjectFileObject = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  projectData: any,
  DI: {
    fetchMoraData: (payload: {
      accentPhrases: AccentPhrase[];
      engineId: EngineId;
      styleId: StyleId;
    }) => Promise<AccentPhrase[]>;
    voices: Voice[];
  },
) => {
  const { fetchMoraData, voices } = DI;

  // appVersion Validation check
  if (
    !("appVersion" in projectData && typeof projectData.appVersion === "string")
  ) {
    throw new ProjectFileFormatError(
      "The appVersion of the project file should be string",
    );
  }
  const projectAppVersion: string = projectData.appVersion;
  if (!semver.valid(projectAppVersion)) {
    throw new ProjectFileFormatError(
      `The app version of the project file "${projectAppVersion}" is invalid. The app version should be a string in semver format.`,
    );
  }

  const semverSatisfiesOptions: semver.RangeOptions = {
    includePrerelease: true,
  };

  // Migration
  const engineId = EngineId("074fc39e-678b-4c13-8916-ffca8d505d1d");

  if (semver.satisfies(projectAppVersion, "<0.4", semverSatisfiesOptions)) {
    for (const audioItemsKey in projectData.audioItems) {
      // typos:ignore-next-line
      if ("charactorIndex" in projectData.audioItems[audioItemsKey]) {
        projectData.audioItems[audioItemsKey].characterIndex =
          // typos:ignore-next-line
          projectData.audioItems[audioItemsKey].charactorIndex;
        // typos:ignore-next-line
        delete projectData.audioItems[audioItemsKey].charactorIndex;
      }
    }
    for (const audioItemsKey in projectData.audioItems) {
      if (projectData.audioItems[audioItemsKey].query != null) {
        projectData.audioItems[audioItemsKey].query.volumeScale = 1;
        projectData.audioItems[audioItemsKey].query.pauseLengthScale = 1;
        projectData.audioItems[audioItemsKey].query.prePhonemeLength = 0.1;
        projectData.audioItems[audioItemsKey].query.postPhonemeLength = 0.1;
        projectData.audioItems[audioItemsKey].query.outputSamplingRate =
          DEFAULT_SAMPLING_RATE;
      }
    }
  }

  if (semver.satisfies(projectAppVersion, "<0.5", semverSatisfiesOptions)) {
    for (const audioItemsKey in projectData.audioItems) {
      const audioItem = projectData.audioItems[audioItemsKey];
      if (audioItem.query != null) {
        audioItem.query.outputStereo = false;
        for (const accentPhrase of audioItem.query.accentPhrases) {
          if (accentPhrase.pauseMora) {
            accentPhrase.pauseMora.vowelLength = 0;
          }
          for (const mora of accentPhrase.moras) {
            if (mora.consonant) {
              mora.consonantLength = 0;
            }
            mora.vowelLength = 0;
          }
        }

        // set phoneme length
        // 0.7 未満のプロジェクトファイルは styleId ではなく characterIndex なので、ここだけ characterIndex とした
        if (audioItem.characterIndex == undefined)
          throw new Error("audioItem.characterIndex === undefined");
        await fetchMoraData({
          accentPhrases: audioItem.query.accentPhrases,
          engineId,
          styleId: audioItem.characterIndex,
        }).then((accentPhrases: AccentPhrase[]) => {
          accentPhrases.forEach((newAccentPhrase, i) => {
            const oldAccentPhrase = audioItem.query.accentPhrases[i];
            if (newAccentPhrase.pauseMora) {
              oldAccentPhrase.pauseMora.vowelLength =
                newAccentPhrase.pauseMora.vowelLength;
            }
            newAccentPhrase.moras.forEach((mora, j) => {
              if (mora.consonant) {
                oldAccentPhrase.moras[j].consonantLength = mora.consonantLength;
              }
              oldAccentPhrase.moras[j].vowelLength = mora.vowelLength;
            });
          });
        });
      }
    }
  }

  if (semver.satisfies(projectAppVersion, "<0.7", semverSatisfiesOptions)) {
    for (const audioItemsKey in projectData.audioItems) {
      const audioItem = projectData.audioItems[audioItemsKey];
      if (audioItem.characterIndex != null) {
        if (audioItem.characterIndex == 0) {
          // 四国めたん 0 -> 四国めたん（あまあま） 0
          audioItem.speaker = 0;
        }
        if (audioItem.characterIndex == 1) {
          // ずんだもん 1 -> ずんだもん（あまあま） 1
          audioItem.speaker = 1;
        }
        delete audioItem.characterIndex;
      }
    }
  }

  if (semver.satisfies(projectAppVersion, "<0.8", semverSatisfiesOptions)) {
    for (const audioItemsKey in projectData.audioItems) {
      const audioItem = projectData.audioItems[audioItemsKey];
      if (audioItem.speaker != null) {
        audioItem.styleId = audioItem.speaker;
        delete audioItem.speaker;
      }
    }
  }

  if (semver.satisfies(projectAppVersion, "<0.14", semverSatisfiesOptions)) {
    for (const audioItemsKey in projectData.audioItems) {
      const audioItem = projectData.audioItems[audioItemsKey];
      if (audioItem.engineId == undefined) {
        audioItem.engineId = engineId;
      }
    }
  }

  if (semver.satisfies(projectAppVersion, "<0.15", semverSatisfiesOptions)) {
    for (const audioItemsKey in projectData.audioItems) {
      const audioItem = projectData.audioItems[audioItemsKey];
      if (audioItem.voice == undefined) {
        const oldEngineId = audioItem.engineId;
        const oldStyleId = audioItem.styleId;
        const voice = voices.find(
          (voice) =>
            voice.engineId === audioItem.engineId &&
            voice.styleId === audioItem.styleId,
        );
        if (voice == undefined)
          throw new Error(`voice == undefined: ${oldEngineId}, ${oldStyleId}`);
        audioItem.voice = voice;

        delete audioItem.engineId;
        delete audioItem.styleId;
      }
    }
  }

  if (semver.satisfies(projectAppVersion, "<0.17", semverSatisfiesOptions)) {
    // 0.17 未満のプロジェクトファイルはトークの情報のみ
    // なので全情報(audioKeys/audioItems)をtalkに移動する
    projectData.talk = {
      audioKeys: projectData.audioKeys,
      audioItems: projectData.audioItems,
    };

    // ソングの情報を初期化
    // generateSingingStoreInitialScoreが今後変わることがあるかもしれないので、
    // 0.17時点のスコア情報を直接書く
    projectData.song = {
      tpqn: DEFAULT_TPQN,
      tempos: [
        {
          position: 0,
          bpm: DEFAULT_BPM,
        },
      ],
      timeSignatures: [
        {
          measureNumber: 1,
          beats: DEFAULT_BEATS,
          beatType: DEFAULT_BEAT_TYPE,
        },
      ],
      tracks: [
        {
          singer: undefined,
          keyRangeAdjustment: 0,
          notes: [],
        },
      ],
    };

    delete projectData.audioKeys;
    delete projectData.audioItems;
  }

  if (semver.satisfies(projectAppVersion, "<0.17.1", semverSatisfiesOptions)) {
    // 声量調整値の追加
    for (const track of projectData.song.tracks) {
      track.volumeRangeAdjustment = 0;
    }
  }

  if (semver.satisfies(projectAppVersion, "<0.19.0", semverSatisfiesOptions)) {
    // ピッチ編集値の追加
    for (const track of projectData.song.tracks) {
      track.pitchEditData = [];
    }
  }

  if (semver.satisfies(projectAppVersion, "<0.20.0", semverSatisfiesOptions)) {
    // tracks: Track[] -> tracks: Record<TrackId, Track> + trackOrder: TrackId[]
    const newTracks: Record<TrackId, unknown> = {};
    for (const track of projectData.song.tracks) {
      track.name = DEFAULT_TRACK_NAME;
      track.solo = false;
      track.mute = false;
      track.gain = 1;
      track.pan = 0;
      newTracks[TrackId(uuid4())] = track;
    }
    projectData.song.tracks = newTracks;
    projectData.song.trackOrder = Object.keys(newTracks);
  }

  if (semver.satisfies(projectAppVersion, "<0.22.0", semverSatisfiesOptions)) {
    // 文内無音倍率の追加
    for (const audioItemsKey in projectData.talk.audioItems) {
      projectData.talk.audioItems[audioItemsKey].query.pauseLengthScale = 1;
    }
  }

  if (semver.satisfies(projectAppVersion, "<0.24.0", semverSatisfiesOptions)) {
    // 音素タイミング編集値の追加
    for (const trackId in projectData.song.tracks) {
      projectData.song.tracks[trackId].phonemeTimingEditData = {};
    }
  }

  // Validation check
  // トークはvalidateTalkProjectで検証する
  // ソングはSET_SCOREの中の`isValidScore`関数で検証される
  const parsedProjectData = projectFileSchema.parse(projectData);
  validateTalkProject(parsedProjectData.talk);

  return parsedProjectData;
};
