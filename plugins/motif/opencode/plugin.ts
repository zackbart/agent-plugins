import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"

export const MotifPlugin: Plugin = async ({ directory, $ }) => {
  const motifDir = `${directory}/.motif`
  const statePath = `${motifDir}/state.json`
  const activePath = `${motifDir}/.active`

  return {
    tool: {
      motif_read_state: tool({
        description: "Read the current motif workflow state from .motif/state.json",
        args: {},
        async execute() {
          try {
            const stateFile = Bun.file(statePath)
            if (await stateFile.exists()) {
              return await stateFile.text()
            }
            return "No active workflow — .motif/state.json does not exist."
          } catch (error) {
            return `Error reading state: ${error instanceof Error ? error.message : String(error)}`
          }
        },
      }),

      motif_write_state: tool({
        description: "Write or update the motif workflow state in .motif/state.json",
        args: {
          state: tool.schema.string(),
        },
        async execute(args) {
          try {
            await $`mkdir -p ${motifDir}`
            await Bun.write(statePath, args.state)
            return "State written successfully."
          } catch (error) {
            return `Error writing state: ${error instanceof Error ? error.message : String(error)}`
          }
        },
      }),

      motif_init: tool({
        description:
          "Initialize a new motif workflow — creates .motif/ directory with state.json, context.md, and .active flag",
        args: {
          task: tool.schema.string(),
          autoApprove: tool.schema.boolean().optional(),
          criticChoice: tool.schema.string().optional(),
        },
        async execute(args) {
          try {
            // Clean up any previous workflow
            await $`rm -rf ${motifDir}`
            await $`mkdir -p ${motifDir}`

            const now = new Date().toISOString()
            const state = {
              stage: "research",
              complexity: null,
              task: args.task,
              startedAt: now,
              stageStartedAt: now,
              activeAgent: null,
              autoApprove: args.autoApprove ?? false,
              criticChoice: args.criticChoice ?? null,
              tasksCompleted: 0,
              tasksTotal: 0,
              tasksFailed: 0,
              tasks: {},
            }

            await Bun.write(statePath, JSON.stringify(state, null, 2))
            await Bun.write(activePath, "")
            await Bun.write(
              `${motifDir}/context.md`,
              `# Motif Workflow Context\n**Task:** ${args.task}\n**Started:** ${now}\n`
            )

            return `Workflow initialized for task: ${args.task}`
          } catch (error) {
            return `Error initializing workflow: ${error instanceof Error ? error.message : String(error)}`
          }
        },
      }),

      motif_cleanup: tool({
        description: "Clean up the .motif/ directory after a completed workflow",
        args: {},
        async execute() {
          try {
            await $`rm -rf ${motifDir}`
            return "Workflow directory cleaned up."
          } catch (error) {
            return `Error cleaning up: ${error instanceof Error ? error.message : String(error)}`
          }
        },
      }),
    },

    event: async ({ event }) => {
      // Detect interrupted workflows when a new session starts
      if (event.type === "session.created") {
        try {
          const activeFile = Bun.file(activePath)
          if (await activeFile.exists()) {
            const stateFile = Bun.file(statePath)
            if (await stateFile.exists()) {
              const state = JSON.parse(await stateFile.text())
              console.log(
                `[motif] Interrupted workflow detected — task: "${state.task}", ` +
                `stage: ${state.stage}. Use /dev --resume to continue.`
              )
            }
          }
        } catch {
          // Silently ignore
        }
      }
    },
  }
}
