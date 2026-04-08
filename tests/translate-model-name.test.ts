import { describe, test, expect, beforeEach } from "bun:test"

import type { AnthropicMessagesPayload } from "~/routes/messages/anthropic-types"

import { state } from "~/lib/state"
import { translateToOpenAI } from "~/routes/messages/non-stream-translation"

/**
 * Tests for translateModelName (exercised via translateToOpenAI).
 *
 * translateModelName extracts the model family (e.g. "opus", "sonnet", "haiku")
 * from the requested model id and maps it to the corresponding selected model.
 */

function makePayload(model: string): AnthropicMessagesPayload {
  return {
    model,
    messages: [{ role: "user", content: "Hello" }],
    max_tokens: 100,
  }
}

describe("translateModelName", () => {
  beforeEach(() => {
    // Reset state to claude-code mode with typical selections
    state.claudeEnable = true
    state.selectedModel = "claude-opus-4-20260301"
    state.selectedSmallModel = "claude-sonnet-4.5-20260301"
  })

  // -- Happy paths: family extraction and matching --

  test("should map claude-opus-4.5 to selectedModel (opus family)", () => {
    const result = translateToOpenAI(makePayload("claude-opus-4.5"))
    expect(result.model).toBe("claude-opus-4-20260301")
  })

  test("should map claude-opus-4.6 to selectedModel (opus family)", () => {
    const result = translateToOpenAI(makePayload("claude-opus-4.6"))
    expect(result.model).toBe("claude-opus-4-20260301")
  })

  test("should map claude-sonnet-4.5 to selectedSmallModel (sonnet family)", () => {
    const result = translateToOpenAI(makePayload("claude-sonnet-4.5"))
    expect(result.model).toBe("claude-sonnet-4.5-20260301")
  })

  test("should map claude-sonnet-4 to selectedSmallModel (sonnet family)", () => {
    const result = translateToOpenAI(makePayload("claude-sonnet-4"))
    expect(result.model).toBe("claude-sonnet-4.5-20260301")
  })

  test("should map claude-haiku-3.5 to selectedSmallModel when it has haiku", () => {
    state.selectedSmallModel = "claude-haiku-3.5-20260301"
    const result = translateToOpenAI(makePayload("claude-haiku-3.5"))
    expect(result.model).toBe("claude-haiku-3.5-20260301")
  })

  // -- Non-claude-code mode: passthrough --

  test("should return model as-is when claudeEnable is false", () => {
    state.claudeEnable = false
    const result = translateToOpenAI(makePayload("claude-sonnet-4.5"))
    expect(result.model).toBe("claude-sonnet-4.5")
  })

  // -- Error cases --

  test("should throw when requesting non-Claude model in claude-code mode", () => {
    expect(() => translateToOpenAI(makePayload("gpt-4o"))).toThrow(
      "Only support Claude model families",
    )
  })

  test("should throw when no selected model matches the requested family", () => {
    expect(() => translateToOpenAI(makePayload("claude-haiku-3.5"))).toThrow(
      "Mismatched between selected model family and requested model family",
    )
  })

  test("should throw when selectedModel is not set", () => {
    state.selectedModel = undefined
    expect(() => translateToOpenAI(makePayload("claude-opus-4.5"))).toThrow(
      "Models are not select in Claude mode",
    )
  })

  test("should throw when selectedSmallModel is not set", () => {
    state.selectedSmallModel = undefined
    expect(() => translateToOpenAI(makePayload("claude-opus-4.5"))).toThrow(
      "Models are not select in Claude mode",
    )
  })
})
