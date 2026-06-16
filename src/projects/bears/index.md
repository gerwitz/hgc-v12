---
title: "Bear Den ʕ·ᴥ·ʔ"
---

Bears Den is a service that hosts AI agents, called bears, that are meant to be long-lived and ownable. They can be moved between servers and are fully inspectable.

## Building

As I write this in mid-2026, Bear Den is in very active development. I keep notes about building it at [devlog/](./devlog/).

It started as a deployment of Letta, and the oldest bear still has memory from that era. I wante to experiment with using it as a coding agent, so extracted the [Tokio Axum](https://docs.rs/axum/latest/axum/) foundation from [Hexmap](/projects/hexmap/) and began vibe-coding from there. That initial framework for web serving, managing a database, authentication, and managing worker processes was hand-built. But everything else that makes it Den has been vibe-coded by the bears themselves. (With a little review from other harnesses, because I like to compare models and am using only an OpenAI API in development.)

The vibe-coding is part of the point, for me. Having something this complex to build means I can learn what it's like to really build something where I micro-manage architecture but try to "forget" the code.

## Stack and Architecture

_(As of June 2026)_

I'm using [Bifrost](https://www.getmaxim.ai/bifrost) as a gateway. (LiteLLM is fine, but not as…lite.)

The Den server uses [Postgresql](https://www.postgresql.org/) for operations and history. [Qdrant](https://qdrant.tech/) is used to make memory smarter.

Each bear's memory is stored in a separate [SQLite](https://sqlite.org/) DB, but there's no service deployed for this; it is bundled in the `den-memory` crate.

The other key Den crates are:

- `den-runtime`: the agent runtime: the loops, governance, bear provisioning, conversation storage, memory insertion, tools
- `den-docket`: work-management subsystem (Jira for bears) and task focus, not very mature yet
- `den-web`: web UI for provisioning bears (and basic  chatting)
- `den-acp` and `den-api`: interface to clients and "armatures" (Agent Client Protocol is currently being refactored)

And there's a lot of infrastructure crates: `den-core`, `den-llm`, `den-http`, `den-oauth`

## History

In the aftermath of [the GPT-3 paper](https://www.scientificamerican.com/article/we-asked-gpt-3-to-write-an-academic-paper-about-itself-mdash-then-we-tried-to-get-it-published/) I started paying a lot more attention to LLMs. When ChatGPT happened, we started talking about having our own "household bot" that would grow with us over time. St the time, I was the right level of naive and knowledgable to have dumb ideas like self-hosting a fine-tuned model and started researching how to go about that.

I quickly learned that the LLMs themselves are big investments and was left just "monitoring the situation" until RAG started getting attention. We had enjoyed having a [shared knowledgebase](/projects/the-artificial/wiki/) so my focus turned to context management. Eventually I found [the MemGPT paper](https://arxiv.org/abs/2310.08560) (long after it had been published) and decided to use that team's code. I had some success playing with it locally (using the OpenAI API for LLMs) through the transition to [Letta](https://www.letta.com/blog/announcing-letta/) but the real dream required running them multi-user. The [devlog](./devlog/) starts when I finally set up a Letta server.

The intention was to deploy a bunch of open source projects and write only some minimal glue code. But that glue code got thicker and thicker (largely because my "vibe coding" experiment has gone well) and then Letta backed away from self-hosting.
