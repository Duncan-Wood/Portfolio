const PIECES_BEFORE_JUDGING = 4;
const TIMES_THE_USUAL = 2;
const FEWEST_DECISIONS = 5;

export class Overthinking {
  private decisions = 0;
  private pieces = 0;
  private decisionsOnBoard = 0;
  private noticed = false;
  private said = false;

  get due(): boolean {
    return this.noticed && !this.said;
  }

  decided(): void {
    this.decisions += 1;
  }

  placed(): void {
    if (this.pieces >= PIECES_BEFORE_JUDGING) {
      const usual = this.decisionsOnBoard / this.pieces;
      if (this.decisions > usual * TIMES_THE_USUAL && this.decisions >= FEWEST_DECISIONS) {
        this.noticed = true;
      }
    }

    this.pieces += 1;
    this.decisionsOnBoard += this.decisions;
    this.decisions = 0;
  }

  told(): void {
    this.said = true;
  }

  newBoard(): void {
    this.decisions = 0;
    this.pieces = 0;
    this.decisionsOnBoard = 0;
    this.noticed = false;
  }
}
