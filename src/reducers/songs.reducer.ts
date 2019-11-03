import produce from 'immer';
import { createSelector } from 'reselect';

import { sortDifficultyIds } from '../helpers/song.helpers';
import { DEFAULT_RED, DEFAULT_BLUE } from '../helpers/colors.helpers';

interface Difficulty {
  id: string;
  noteJumpSpeed: number;
  startBeatOffset: number;
  customLabel?: string;
}

interface ModSettings {
  mappingExtensions?: {
    numRows: number;
    numCols: number;
    cellWidth: number;
    cellHeight: number;
  };
  customColors?: {
    colorLeft: string;
    colorRight: string;
    envColorLeft: string;
    envColorRight: string;
    obstacleColor: string;
  };
}

interface Song {
  id: string;
  name: string;
  subName?: string;
  artistName: string;
  mapAuthorName?: string;
  bpm: number;
  offset: number;
  swingAmount?: number;
  swingPeriod?: number;
  previewStartTime: number;
  previewDuration: number;
  environment:
    | 'DefaultEnvironment'
    | 'BigMirrorEnvironment'
    | 'TriangleEnvironment'
    | 'NiceEnvironment'
    | 'DragonsEnvironment';
  songFilename: string;
  coverArtFilename: string;
  difficultiesById: { [key: string]: Difficulty };
  selectedDifficulty?: Difficulty;
  createdAt: number;
  lastOpenedAt: number;
  demo?: boolean;
  modSettings: ModSettings;
}

interface State {
  byId: { [key: string]: Song };
  selectedId: string | null;
  processingImport: boolean;
}

const initialState = {
  byId: {},
  selectedId: null,
  processingImport: false,
};

const DEFAULT_NOTE_JUMP_SPEEDS = {
  Easy: 10,
  Normal: 10,
  Hard: 12,
  Expert: 15,
  ExpertPlus: 18,
};

const DEFAULT_MOD_SETTINGS = {
  customColors: {
    colorLeft: DEFAULT_RED,
    colorRight: DEFAULT_BLUE,
    envColorLeft: DEFAULT_RED,
    envColorRight: DEFAULT_BLUE,
    obstacleColor: DEFAULT_RED,
  },
};

export default function songsReducer(state: State = initialState, action: any) {
  switch (action.type) {
    case 'START_LOADING_SONG': {
      const { songId, difficulty } = action;

      return produce(state, (draftState: State) => {
        draftState.selectedId = songId;
        draftState.byId[songId].selectedDifficulty = difficulty;
      });
    }

    case 'FINISH_LOADING_SONG': {
      const { song, lastOpenedAt } = action;

      return produce(state, (draftState: State) => {
        const draftSong = draftState.byId[song.id];

        draftSong.lastOpenedAt = lastOpenedAt;
        draftSong.modSettings = draftSong.modSettings || {};
      });
    }

    case 'LEAVE_EDITOR': {
      return {
        ...state,
        selectedId: null,
      };
    }

    case 'START_IMPORTING_SONG': {
      return {
        ...state,
        processingImport: true,
      };
    }

    case 'CANCEL_IMPORTING_SONG': {
      return {
        ...state,
        processingImport: false,
      };
    }

    case 'CREATE_NEW_SONG': {
      const {
        coverArtFilename,
        songFilename,
        songId,
        name,
        subName,
        artistName,
        bpm,
        offset,
        selectedDifficulty,
        mapAuthorName,
        createdAt,
        lastOpenedAt,
      } = action;

      return produce(state, (draftState: State) => {
        draftState.selectedId = songId;
        draftState.byId[songId] = {
          id: songId,
          name,
          subName,
          artistName,
          bpm,
          offset,
          previewStartTime: 12,
          previewDuration: 10,
          songFilename,
          coverArtFilename,
          environment: 'DefaultEnvironment',
          mapAuthorName,
          createdAt,
          lastOpenedAt,
          selectedDifficulty,
          difficultiesById: {
            [selectedDifficulty]: {
              id: selectedDifficulty,
              // @ts-ignore
              noteJumpSpeed: DEFAULT_NOTE_JUMP_SPEEDS[selectedDifficulty],
              startBeatOffset: 0,
              customLabel: '',
            },
          },
          modSettings: {},
        };
      });
    }

    case 'IMPORT_EXISTING_SONG': {
      const {
        createdAt,
        lastOpenedAt,
        songData: {
          songId,
          songFilename,
          coverArtFilename,
          name,
          subName,
          artistName,
          mapAuthorName,
          bpm,
          offset,
          swingAmount,
          swingPeriod,
          previewStartTime,
          previewDuration,
          environment,
          difficultiesById,
          demo,
          modSettings = {},
        },
      } = action;

      // @ts-ignore
      const selectedDifficulty: Difficulty = Object.keys(difficultiesById)[0];

      return produce(state, (draftState: State) => {
        draftState.processingImport = false;
        draftState.byId[songId] = {
          id: songId,
          name,
          subName,
          artistName,
          mapAuthorName,
          bpm,
          offset,
          swingAmount,
          swingPeriod,
          previewStartTime,
          previewDuration,
          songFilename,
          coverArtFilename,
          environment,
          selectedDifficulty,
          difficultiesById,
          createdAt,
          lastOpenedAt,
          demo,
          modSettings,
        };
      });
    }

    case 'UPDATE_SONG_DETAILS': {
      const { type, songId, ...fieldsToUpdate } = action;

      return produce(state, (draftState: State) => {
        draftState.byId[songId] = {
          ...draftState.byId[songId],
          ...fieldsToUpdate,
        };
      });
    }

    case 'CREATE_DIFFICULTY': {
      const { difficulty } = action;

      return produce(state, (draftState: State) => {
        const selectedSongId = state.selectedId;

        if (!selectedSongId) {
          return state;
        }

        const song = draftState.byId[selectedSongId];

        song.selectedDifficulty = difficulty;
        song.difficultiesById[difficulty] = {
          id: difficulty,
          // @ts-ignore
          noteJumpSpeed: DEFAULT_NOTE_JUMP_SPEEDS[difficulty],
          startBeatOffset: 0,
          customLabel: '',
        };
      });
    }

    case 'COPY_DIFFICULTY': {
      const { songId, fromDifficultyId, toDifficultyId } = action;

      return produce(state, (draftState: State) => {
        const song = draftState.byId[songId];

        const newDifficultyObj = {
          ...song.difficultiesById[fromDifficultyId],
          id: toDifficultyId,
        };

        song.selectedDifficulty = toDifficultyId;
        song.difficultiesById[toDifficultyId] = newDifficultyObj;
      });
    }

    case 'CHANGE_SELECTED_DIFFICULTY': {
      const { songId, difficulty } = action;

      return produce(state, (draftState: State) => {
        const song = draftState.byId[songId];

        song.selectedDifficulty = difficulty;
      });
    }

    case 'DELETE_BEATMAP': {
      const { songId, difficulty } = action;

      return produce(state, (draftState: State) => {
        delete draftState.byId[songId].difficultiesById[difficulty];
      });
    }

    case 'UPDATE_BEATMAP_METADATA': {
      const {
        songId,
        difficulty,
        noteJumpSpeed,
        startBeatOffset,
        customLabel,
      } = action;

      return produce(state, (draftState: State) => {
        const currentBeatmapDifficulty =
          draftState.byId[songId].difficultiesById[difficulty];

        currentBeatmapDifficulty.noteJumpSpeed = noteJumpSpeed;
        currentBeatmapDifficulty.startBeatOffset = startBeatOffset;
        currentBeatmapDifficulty.customLabel = customLabel;
      });
    }

    case 'DELETE_SONG': {
      const { songId } = action;

      return produce(state, (draftState: State) => {
        delete draftState.byId[songId];
      });
    }

    case 'TOGGLE_MOD_FOR_SONG': {
      const { mod } = action;

      return produce(state, (draftState: any) => {
        if (!state.selectedId || !draftState.byId[state.selectedId]) {
          return state;
        }
        const song = draftState.byId[state.selectedId];
        const isModEnabled = !!song.modSettings[mod];
        if (isModEnabled) {
          song.modSettings[mod] = null;
        } else {
          // @ts-ignore
          const defaultSettings = DEFAULT_MOD_SETTINGS[mod];
          song.modSettings[mod] = defaultSettings;
        }
      });
    }

    case 'UPDATE_MOD_COLOR': {
      const { element, color } = action;

      return produce(state, (draftState: State) => {
        if (!state.selectedId || !draftState.byId[state.selectedId]) {
          return state;
        }

        const song = draftState.byId[state.selectedId];

        if (!song.modSettings.customColors) {
          return;
        }

        // @ts-ignore
        song.modSettings.customColors[element] = color;
      });
    }

    default:
      return state;
  }
}

const getById = (state: any) => state.songs.byId;

export const getAllSongs = (state: any): Array<Song> => {
  return Object.values(getById(state));
};
export const getAllSongIds = (state: any) => {
  return Object.keys(getById(state));
};
export const getAllSongsChronologically = (state: any) => {
  return getAllSongs(state).sort((a: Song, b: Song) => {
    return a.lastOpenedAt > b.lastOpenedAt ? -1 : 1;
  });
};

export const getProcessingImport = (state: any) => state.songs.processingImport;

export const getSongById = (state: any, songId: string) => {
  const byId = getById(state);
  return byId[songId];
};

export const getSelectedSongId = (state: any) => {
  return state.songs.selectedId;
};

export const getSelectedSong = (state: any) => {
  const byId = getById(state);
  return byId[getSelectedSongId(state)];
};

export const getSelectedSongDifficultyIds = createSelector(
  getSelectedSong,
  (selectedSong: any) => {
    /**
     * This selector comes with the added bonus that difficulties are sorted
     * (easy to expert+)
     */
    const ids = Object.keys(selectedSong.difficultiesById);

    // @ts-ignore
    return sortDifficultyIds(ids);
  }
);

export const getDemoSong = (state: any) => {
  return getAllSongs(state).find(song => song.demo);
};
