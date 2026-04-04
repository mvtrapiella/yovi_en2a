export default function GameModesHelp() {
  return (
    <div>
      <h2>Game Modes</h2>
      <p>
        Before starting a match, choose the game mode and board size that suits you best.
      </p>

      {/* IMAGEN: captura de la pantalla de selección de modo */}

      <section>
        <h3>vs Bot</h3>
        <p>
          Play against an AI opponent. The bot will automatically make its move 
          after yours. A good option to practice your strategy solo.
        </p>
      </section>

      <section>
        <h3>vs Human (local)</h3>
        <p>
          Two players take turns on the same device. Great for playing with a 
          friend sitting next to you.
        </p>
      </section>

      <section>
        <h3>Board size</h3>
        <p>
          Choose from different board sizes before starting. Smaller boards make 
          for faster games, while larger boards require deeper strategy and longer sessions.
        </p>
        {/* IMAGEN: comparativa de tableros de diferente tamaño */}
      </section>
    </div>
  );
}