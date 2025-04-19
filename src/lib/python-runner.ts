import type { WorkerState } from '../workers/canvas'; // Assuming state type is defined here
import { updateVoxelMesh, resetVoxelData } from '../utils/voxel-utils'; // Adjusted path based on canvas.worker.ts

/**
 * Context object containing built-in functions and constants available to Python code
 */
export const pythonContext = {
    "True": true,
    "False": false,
    "print": (...args: unknown[]) => {
        console.log('Python print:', ...args);
        // Optional: Post message back to main thread for logging in UI
        // self.postMessage({ type: 'log', level: 'info', message: args.join(' ') });
    },
    "max": Math.max, "min": Math.min, "abs": Math.abs, "round": Math.round,
    "floor": Math.floor, "ceil": Math.ceil, "random": Math.random, "sqrt": Math.sqrt,
    "sin": Math.sin, "cos": Math.cos, "tan": Math.tan, "asin": Math.asin,
    "acos": Math.acos, "atan": Math.atan, "atan2": Math.atan2, "pow": Math.pow,
    "log": Math.log, "exp": Math.exp, "log10": Math.log10, "log2": Math.log2,
    "log1p": Math.log1p, "hypot": Math.hypot,
    "PI": Math.PI, "E": Math.E, "LN2": Math.LN2, "LN10": Math.LN10,
    "LOG2E": Math.LOG2E, "LOG10E": Math.LOG10E, "SQRT1_2": Math.SQRT1_2, "SQRT2": Math.SQRT2,
    "mod": (x: number, y: number) => x % y,
    "div": (x: number, y: number) => x / y,
    "range": (start: number, stop?: number, step: number = 1) => {
        const result = [];
        let current = (stop === undefined) ? 0 : start;
        const end = (stop === undefined) ? start : stop;
        if (step === 0) throw new Error("range() step cannot be zero");
        if (step > 0) {
            while (current < end) {
                result.push(current);
                current += step;
            }
        } else { // step < 0
             while (current > end) {
                result.push(current);
                current += step;
            }
        }
        return result;
    },
    "len": (x: any[] | string) => x.length,
    "1e": Math.E, "EULER": Math.E, "TAU": Math.PI * 2,
};

/**
 * Runs Python code using the interpreter and updates voxel data in the state.
 * @param state - The shared worker state.
 * @param code - The Python code string to execute.
 * @returns Promise that resolves when execution is complete or rejects on error.
 */
export async function runPythonCode(state: WorkerState, code: string): Promise<void> {
    const { interpreter, gridSize } = state;

    if (!interpreter || !state.voxelData) { // Check voxelData too
        throw new Error('Interpreter or voxelData not initialized');
    }

    console.log(`Running Python code for grid size ${gridSize}...`);
    const startTime = performance.now();

    // Reset voxel data before running
    resetVoxelData(state);

    // Parse the Python code once
    // Use a try-catch here to report parsing errors immediately
    let codeAst;
    try {
        codeAst = interpreter.parse(code);
    } catch (parseError) {
        console.error("Python parsing error:", parseError);
        const error = parseError instanceof Error ? parseError : new Error(String(parseError));
        // Include more specific error type if possible
        throw new Error(`Python Syntax Error: ${error.message}`); // Rethrow for main handler
    }


    // Evaluate Python code for each coordinate
    for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
            for (let z = 0; z < gridSize; z++) {
                try {
                    // Execute the 'draw' function from the parsed code
                    const result = interpreter.eval(codeAst, pythonContext, ["draw", x, y, z, gridSize]);

                    // Update voxelData based on result
                    if (typeof result === 'string' && result.length > 0) {
                        state.voxelData[x][y][z] = result; // Use the string as color
                    } else if (result === true) {
                        state.voxelData[x][y][z] = '#00ff00'; // Default green for True
                    } else {
                        state.voxelData[x][y][z] = null; // False, null, undefined -> empty
                    }

                } catch (evalErr) {
                    const error = evalErr instanceof Error ? evalErr : new Error(String(evalErr));
                    // Report error but continue processing other voxels
                    const errorMessage = `Code evaluation error at (${x},${y},${z}): ${error.message}`;
                    console.error(errorMessage);
                    // Post a warning message back to the main thread for potential UI display
                    self.postMessage({ type: 'warning', message: errorMessage });
                    state.voxelData[x][y][z] = null; // Ensure voxel is empty on error
                }
            } // End of z loop

            // Yield control briefly every few rows (after completing a z-row) to prevent blocking
            if (y % 5 === 0) { // Check y after the z loop finishes
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        } // End of y loop
    } // End of x loop

    const executionTime = performance.now() - startTime;
    console.log(`Python execution finished in ${executionTime.toFixed(2)} ms.`);

    // Regenerate the entire voxel mesh based on the updated voxelData
    updateVoxelMesh(state); // Pass state

    console.log("Python code run complete.");
}