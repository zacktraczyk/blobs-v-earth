import { GameService } from "../game/services/GameService";

type Team = "earthling" | "blob";

interface TeamSelectionModalProps {
  onTeamSelect: (team: Team) => void;
  isOpen: boolean;
}

export function TeamSelectionModal({
  onTeamSelect,
  isOpen,
}: TeamSelectionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl">
        <h2 className="text-2xl font-bold mb-6 text-center">
          Choose Your Team
        </h2>
        <div className="flex gap-6">
          <button
            onClick={() => onTeamSelect("earthling")}
            className="bg-blue-500 text-white px-8 py-4 rounded-lg hover:bg-blue-600 transition-colors flex flex-col items-center"
          >
            <span className="text-xl font-semibold">Earthling</span>
            <span className="text-sm mt-2">Defend Earth</span>
          </button>
          <button
            onClick={() => onTeamSelect("blob")}
            className="bg-green-500 text-white px-8 py-4 rounded-lg hover:bg-green-600 transition-colors flex flex-col items-center"
          >
            <span className="text-xl font-semibold">Blob</span>
            <span className="text-sm mt-2">Invade Earth</span>
          </button>
        </div>
      </div>
    </div>
  );
}
