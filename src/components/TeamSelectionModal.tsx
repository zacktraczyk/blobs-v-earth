import { GameService } from "../game/services/GameService";

type Team = "red" | "blue";

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg">
        <h2 className="text-2xl font-bold mb-4">Select Your Team</h2>
        <div className="flex gap-4">
          <button
            onClick={() => onTeamSelect("red")}
            className="bg-red-500 text-white px-6 py-2 rounded hover:bg-red-600"
          >
            Join Red Team
          </button>
          <button
            onClick={() => onTeamSelect("blue")}
            className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
          >
            Join Blue Team
          </button>
        </div>
      </div>
    </div>
  );
}
