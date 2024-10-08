/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";
import './style.css'

interface GridSquareProps{
    index:number;
    onClick: (index:number)=> void;
    isExplosive: boolean;
    uncovered: boolean;
    nearbyMinesCount: number;
}


const GridSquare = ({
    index,
    onClick,
    isExplosive,
    uncovered,
    nearbyMinesCount,
  }: GridSquareProps) => {
    return (
        <div
            id={`mine-${index}`}
            className={`mine ${isExplosive ? "live" : ""}`}
            onClick={() => {
                onClick(index);
            }}
        >
            <div
                id={`mine-overlay-${index}`}
                className="overlay"
                style={{
                    display: uncovered ? "none" : undefined,
                }}
            />
            <span 
                id={`mine-nearby-count-${index}`} 
                className="nearby-count"
                data-count={nearbyMinesCount}  // Add this line
            >
                {isExplosive ? "💥" : nearbyMinesCount || ""} 
            </span>
        </div>
    );
};

interface GridProps {
    height: number;
    width: number;
    uncoverSquare: (index: number) => void;
    grid: boolean[][];
    uncovered: boolean[][];
    mineCounts: number[][];
}
  
const Grid = ({ height, width, uncoverSquare, grid, uncovered, mineCounts }: GridProps) => {

    const mines = React.useMemo(() => {
    let result = [] as React.ReactNode[];
    for (let i = 0; i < height * width; i++) {
        const row = Math.floor(i / width);
        const col = i % width;
        result.push(
        <GridSquare
            index={i}
            key={i}
            onClick={uncoverSquare}
            isExplosive={grid[row][col]}
            uncovered={uncovered[row][col]}
            nearbyMinesCount={mineCounts[row][col]}
        />
        );
    }
    return result;
    }, [height, width, uncoverSquare, grid, uncovered, mineCounts]);

    return (
    <div
        id="minefield"
        className="minefield"
        style={{ gridTemplateColumns: `repeat(${width}, 1fr)` }}
    >
        {mines}
    </div>
    );
};
  
type Seed = [width: number, height: number, mineLocations: number[]];
  
function processSeed(seed: string): Seed | null {
    try {
        const [width, height, ...mineIndices] = seed.split(",").map(Number);
      
        if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
            return null;
        }

        const uniqueMines = Array.from(new Set(mineIndices));
        
        if (uniqueMines.some(idx => idx >= width * height || idx < 0)) {
            return null;
        }
        
        return [width, height, uniqueMines];

    } catch {
        return null;
    }
}

const GameSeedInput = ({
    setSeed,
}: {
    setSeed: (seed: Seed | null) => void;
}) => {
    const [_seed, _setSeed] = React.useState<string>("");

    return (
    <div id="game-seed-input">
        <input
            id="game-seed-input-input"
            type="text"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                _setSeed(e.target?.value ?? "");
            }}
            placeholder={"Game Seed"}
        />
        <button
            id="game-seed-input-button"
            onClick={() => {
                const processedSeed = processSeed(_seed);
                setSeed(processedSeed);
            }}
        >
            Play
        </button>
    </div>
    );
};

  
const GameOver = ({
    restartGame,
    wonOrLost,
}: {
    restartGame: () => void;
    wonOrLost: "won" | "lost";
}) => {
    return (
    <div onClick={() => restartGame()} id="minesweeper-game-over">
        You {wonOrLost === "lost" ? "Lost" : "Won"} - Click to restart
    </div>
    );
};

export const Minesweeper = () => {
    const [seed, setSeed] = React.useState<Seed | null>(null);
    const [grid, setGrid] = React.useState<boolean[][] | null>(null);
    const [uncovered, setUncovered] = React.useState<boolean[][] | null>(null);
    const [mineCounts, setMineCounts] = React.useState<number[][] | null>(null);
    const [gameStatus, setGameStatus] = React.useState<"playing" | "won" | "lost">("playing");
    
    const initializeGame = React.useCallback((newSeed: Seed | null) => {
        if (!newSeed) {
            setGrid(null);
            setUncovered(null);
            setMineCounts(null);
            setGameStatus("playing");
            return;
        }
        
        const [width, height, mineLocations] = newSeed;
        const newGrid = Array.from({ length: height }, () => Array(width).fill(false));
        const newUncovered = Array.from({ length: height }, () => Array(width).fill(false));
        const newMineCounts = Array.from({ length: height }, () => Array(width).fill(0));

        for (let index of mineLocations) {
            const row = Math.floor(index / width);
            const col = index % width;
            newGrid[row][col] = true;
    
            for (let x = -1; x <= 1; x++) {
                for (let y = -1; y <= 1; y++) {
                    if (x === 0 && y === 0) continue;
                    const adjRow = row + x;
                    const adjCol = col + y;
                    if (adjRow >= 0 && adjRow < height && adjCol >= 0 && adjCol < width) {
                        newMineCounts[adjRow][adjCol]++;
                    }
                }
            }
        }

        setGrid(newGrid);
        setUncovered(newUncovered);
        setMineCounts(newMineCounts);
        setGameStatus("playing");
    }, []);

    React.useEffect(() => {
    initializeGame(seed);
    }, [seed, initializeGame]);
    
    const checkWinCondition = React.useCallback((currentUncovered: boolean[][]) => {
        if (!grid || !seed) return false;
        
        const [width, height, mineLocations] = seed;
        
        let safeCellsUncovered = 0;
        const totalSafeCells = width * height - mineLocations.length;
        
        for (let row = 0; row < height; row++) {
          for (let col = 0; col < width; col++) {
            if (!grid[row][col] && currentUncovered[row][col]) {
              safeCellsUncovered++;
            }
          }
        }
        
        return safeCellsUncovered === totalSafeCells;
        
    }, [grid, seed]);

    
    const revealSquares = React.useCallback((row: number, col: number) => {
        if (!grid || !uncovered || !mineCounts || !seed) return;
        const [width, height] = seed;
        
        const newUncovered = uncovered.map(row => [...row]);
        const queue: [number, number][] = [[row, col]];
        let madeChanges = false;
        
        while (queue.length > 0) {
        const [currentRow, currentCol] = queue.shift()!;
        
        if (currentRow < 0 || currentRow >= height || 
            currentCol < 0 || currentCol >= width || 
            newUncovered[currentRow][currentCol] ||
            grid[currentRow][currentCol]) {
            continue;
        }
        
        newUncovered[currentRow][currentCol] = true;
        madeChanges = true;
        
        if (mineCounts[currentRow][currentCol] === 0) {
            for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                if (x === 0 && y === 0) continue;
                queue.push([currentRow + x, currentCol + y]);
            }
            }
        }
        }
        
        if (madeChanges) {
            setUncovered(newUncovered);
            const hasWon = checkWinCondition(newUncovered);
            if (hasWon) {
                setGameStatus("won");
            }
        }
    }, [grid, uncovered, mineCounts, seed, checkWinCondition, setGameStatus]);
    
    const uncoverSquare = React.useCallback((index: number) => {
        if (gameStatus !== "playing" || !seed || !grid || !uncovered) return;

        const [width] = seed;
        const row = Math.floor(index / width);
        const col = index % width;

        if (grid[row][col]) {
            const newUncovered = uncovered.map(row => [...row]);
            newUncovered[row][col] = true;
            setUncovered(newUncovered);
            setGameStatus("lost");
            return;
        }

        revealSquares(row, col);
        
    }, [gameStatus, seed, grid, uncovered, revealSquares]);
    
    const restartGame = React.useCallback(() => {
        setSeed(null);
        initializeGame(null);
    }, [initializeGame]);
    
    return (
        <div id="minesweeper-main">
            <h1 id="minesweeper-title">Minesweeper</h1>
            <GameSeedInput setSeed={setSeed}/>
            
            {grid && uncovered && mineCounts && (
                <Grid 
                    height={seed![1]} 
                    width={seed![0]}
                    uncoverSquare={uncoverSquare}
                    grid={grid}
                    uncovered={uncovered}
                    mineCounts={mineCounts}
                />
            )}

            {(gameStatus === "won" || gameStatus === "lost") && (
                <GameOver restartGame={restartGame} wonOrLost={gameStatus} />
            )}
        </div>
    );  
};