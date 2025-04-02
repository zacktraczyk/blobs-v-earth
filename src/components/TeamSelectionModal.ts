import { Team } from "../game/services/GameService";

export class TeamSelectionModal {
  private modal: HTMLDivElement;
  private onTeamSelect: (team: Team) => void;

  constructor(onTeamSelect: (team: Team) => void) {
    this.onTeamSelect = onTeamSelect;
    this.modal = this.createModal();
    document.body.appendChild(this.modal);
  }

  private createModal(): HTMLDivElement {
    const modal = document.createElement("div");
    modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;

    const content = document.createElement("div");
    content.style.cssText = `
            background-color: #1a1a1a;
            padding: 2rem;
            border-radius: 8px;
            text-align: center;
            color: white;
        `;

    const title = document.createElement("h1");
    title.textContent = "Choose Your Team";
    title.style.marginBottom = "2rem";

    const buttonContainer = document.createElement("div");
    buttonContainer.style.display = "flex";
    buttonContainer.style.gap = "1rem";
    buttonContainer.style.justifyContent = "center";

    const earthlingButton = this.createTeamButton("Earthling", "#4B79A1", () =>
      this.selectTeam("earthling")
    );
    const blobButton = this.createTeamButton("Blob", "#27AE60", () =>
      this.selectTeam("blob")
    );

    buttonContainer.appendChild(earthlingButton);
    buttonContainer.appendChild(blobButton);

    content.appendChild(title);
    content.appendChild(buttonContainer);
    modal.appendChild(content);

    return modal;
  }

  private createTeamButton(
    text: string,
    color: string,
    onClick: () => void
  ): HTMLButtonElement {
    const button = document.createElement("button");
    button.textContent = text;
    button.style.cssText = `
            padding: 1rem 2rem;
            font-size: 1.2rem;
            border: none;
            border-radius: 4px;
            background-color: ${color};
            color: white;
            cursor: pointer;
            transition: transform 0.2s;
        `;

    button.addEventListener("mouseover", () => {
      button.style.transform = "scale(1.05)";
    });

    button.addEventListener("mouseout", () => {
      button.style.transform = "scale(1)";
    });

    button.addEventListener("click", onClick);

    return button;
  }

  private selectTeam(team: Team) {
    this.onTeamSelect(team);
    this.modal.remove();
  }
}
