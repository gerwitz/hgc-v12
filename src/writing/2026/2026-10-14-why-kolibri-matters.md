---
title: Why Kolibri Matters
categories:
- work
topics:
- ai
- ethics
- politics
- europe
syndication:
- https://www.linkedin.com/posts/gerwitz_earlier-this-month-aleph-alpha-released-share-7516056602970406912-3Xqa/
---

Earlier this month, Aleph Alpha released a new LLM, [Kolibri](https://aleph-alpha.com/en/kolibri/). It’s open-weights (with a permissive, business-friendly license) and was designed with a well-established architecture that should make it performant (“mixture of experts”).

Kolibri doesn’t get a lot of mainstream attention because it’s neither the most capable nor the most efficient model out there. But it’s a departure in several ways, and we can learn by considering how it’s different.

It can think in German (as well as English). If you’re working with German content or users, this should improve the reasoning quality/effort ratio. Otherwise, I only find it interesting how much evaluation effort it took for them to enable this.

A key area of innovation is epistemic humility. Kolibri was trained using their [Merlin-Arthur protocols](https://arxiv.org/html/2512.11614), which teach the model skepticism during training. Compared to other open weight models, this one is substantially more willing to say “I don’t know” and to question the veracity of sources.

This pairs well with the most interesting aspect of Kolibri’s training. As they succinctly note when introducing their [analysis of political bias in Chinese models](https://aleph-alpha.com/en/blog/training-on-the-party-line/):
> neither people nor companies nor the models we produce are free of biases

Aleph Alpha’s stated intent is thus:
> the model should judge by the values of the broad democratic consensus in Europe

They do this not only through prompting or simple training data creation or curation, but also by generating a training corpus through use of existing models to seed questions and example answers that are in line with the intended values (without bluntly labelling them with topics of moral judgement). Only time will tell how successful they’ve been, but the unusual level of transparency and humility displayed by this team gives me hope.

The best example of that transparency is probably the detailed but accessible [technical report they released alongside Kolibri](https://aleph-alpha.com/downloads/tech-report.pdf), via which I’ve learned quite a bit. In there, you can find a terse description of the “broad democratic consensus in Europe”:
> human dignity, human rights, liberal democracy, the rule of law and pluralism

I appreciate the risks that would come with sharing too much detail about the training described above. Yet I hope we will learn more about the political judgement they are exercising and that other labs[^grok] will follow suit.

[^grok]: Especially ~~SpaceXAI~~ SpaceXSI, who pioneered political alignment while training via distillation with models Musk deemed “too woke”.
