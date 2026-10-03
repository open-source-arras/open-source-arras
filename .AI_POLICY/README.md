# Open Source Arras AI Policy
*This policy applies to anyone who contributes, maintains, or reviews code for Open Source Arras.*

*Text is mostly plagiarized from Harbour Masters' AI Policy. Read it [here](<https://github.com/HarbourMasters/code-of-conduct/blob/main/AI_POLICY.md>).*

> [!IMPORTANT]
> This policy applies to code contributions *only*.
> 
> ***No*** AI use is allowed in the creation of any non-code contributions, such as (but not limited to) images and textures.

## Why have an AI Policy?
On one hand, AI tools have made it much easier for people to produce substantial changes to a codebase, regardless of their prior experience. On the other hand, our community has grown to expect high quality, polished, and bug-free software. 

In order to maintain that quality and ensure maintainers can continue to effectively review contributions, we have implemented the following policy in regards to use of AI tools for contributing to OSA.

## The Policy
Open Source Arras is not *Anti AI*, *however*, we are *Anti Slop[^1]*.

"AI" is a very broad term, and can describe everything from an editor’s tab completion finishing a loop for you, to consulting ChatGPT for advice, to giving Claude a single prompt and having it build an entire game without ever looking at a single line of code.

In today's world it is unrealistic to pretend that you can outright prevent all humans that interact with your project from using AI in some shape or fashion in their workflow. Our goal is instead to provide meaningful guidelines to all Code Contributions, not only to help foster a new generation of potential developers but also to avoid assumptions about whether something is vibe coded or hand crafted.

We are all humans, volunteering our free time to provide a definitive experience for our project and our community. If you see something and have questions or concerns please let us know, it only strengthens us.

## Expectations
*All contributions and interactions throughout the review process should keep the following ideals in mind:*

### We value the human, not your AI subscription
Imagine we receive five contributions implementing the same feature, all generated with AI. The fact that you prompted an AI to produce yours doesn’t distinguish it from the others. What matters is your understanding of the problem, the quality of the solution, and your ability to stand behind and maintain what you submitted.

Anyone can write a prompt. What did you bring to the table?

### Understanding
- You are responsible for what you submit. Do not submit a contribution if you have no intention of fixing bugs, iterating on feedback, or answering questions related to your contribution.
- Using AI to generate code or text you don't understand is not a shortcut; it shifts work onto reviewers and maintainers without adding value.
- Using AI to *build* understanding is encouraged.

### Transparency
- "*Is this AI*?" is not a fruitful question standing alone. 
- Clearly disclose whether AI was used and to what extent, so reviewers can calibrate their expectations and everyone stays on the same page.

### Quality
- Pull Request descriptions should be hand written. If you don't have enough energy to write out a description and instead paste a massive AI generated block, we will not have the energy to read it. You can paste AI generated blocks of text in `<details>` collapsibles with a disclosure that it was written by AI.
- All code should follow the patterns established within the codebase, consistency is key.
- Contributions should be small and limited in scope, we will very likely immediately close anything that is over a thousand LoC change.
- We expect all contributions to be thoroughly tested. This should be common sense but you'd be surprised.
- AI models have a tendency to over abstract and over explain:
    - If a block of code is not used in 3 or more places, it probably doesn't need to be split out into a separate function.
    - Comments should be used sparingly and only to briefly explain "why" the code is doing something or side effects, not "what" it's doing. The variable and function names should be clear enough to explain to the reviewer what is going on.

[^1]: Open Source Arras defines **slop** as code of low quality that reduces the maintainability of the project. This includes (but is not limited to) code that is overly verbose, overly complex, brittle/bug-prone, or consisting of superfluous changes.  
