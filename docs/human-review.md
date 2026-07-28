# Duncan reviews changes after each round of Clauding

> **How to use this log:** after each phase or revision, add a new dated section below
> using the template. Name the file/area, say what you want (not just what's wrong), and
> point at a source repo when a fact needs verifying. Claude reads the newest section,
> lifts any standing preference into `plans/story-portfolio/build-preferences.md` + memory,
> then revises. See [README.md](./README.md) for the full loop.
>
> ```markdown
> ## Review of <phase>, <pass> (<date + time>)
> - <file / area>: <what's off, and what you want instead>
> ```

## Review of Phase 1, initial pass (6/26 at 6:15 pm)
- about.jsx: Seems like we shouldn't dive into that specific experience so quickly, as this should be more general about who I am and what I care about, as opposed to starting off with the resume bullet point type of stuff. It also feels distracting to say stuff like "during an abrupt organizational transition", where that information can be kind of negative and not super relevant to me today. Sounds kind of shady. I want to convey my interest in using tech to improve society by taking part in things that are bigger than myself. This last sentance also doesn't really make much sense to me, "about finding the real root cause of a problem rather than the first fix that compiles."
- experienceData: again, feels weird to say "abrupt organizational transition". This also seems intense but also vague, "resolving severe state-desync issues." I also technically worked on more than two modules, for state scorecard. I'm not sure if I would call them analytics per say, although it's not technically wrong i suppose. you can see more of the git blame from the repo it's in at /Users/duncanecomap.tech/Desktop/Programming/EcoMap/remington, if you ever want to investigate. Is this actually accurate/fair? "Designed a reusable Rails LLM-summarization system across three modules, cut inference cost ~5x, and led a production RAG chatbot's embedding-model migration across 27,000+ records.",
- home.jsx: it's debatable, but my former boss would say that the concept of a frontend and backend engineer was kind of outdataded, and I would say that was true for my role. My official title didnt include frontend, backend, or full-stack, because as a generalist prgoramming I would do all of the above and everything in between. Full stack seems a bit of a clunky convention to use still. 
- the nav.jsx is a bit overflowing now on certain screen sizes, so be careful with that/ come up with a way where we dont have to manually tweak it for it to be responsive. it should be responsive automatically, if that makes sense. 
- Projects.jsx:     
- - name: "Internal Data-Review Tool",
    tech: "Next.js | TypeScript | Supabase | PostgreSQL",
    description:
      "Built from an empty repo as lead developer: surfaces proposed record changes as a field-level diff for the data team to accept or reject, writing approved changes back to the source-of-truth system with a full audit trail. In daily production use.",
      - this was called update detector. you can find that repo here and investigate it to get a more clear understanding of what it is. /Users/duncanecomap.tech/Desktop/Programming/EcoMap/update-detector
- - Reusable AI Summarization System 
    - description a bit off here. the cut cost thing was related to something else, and also never really proven. Look into AI-Summarizable concenr in the remington repo and see how it was a joint effort but i did a lot fo the refining. 
- - some of the personal projects do not seem super compelling/worth the space, such as Tick-iT, amazon clone, and fake twitter,  for example.
- - Also, there is no differntiation between personal and professional projects, which is not only confusing since they arent really the same, it is also causing issues where you might see a load more button too early/ the content isn't displaying properly. 
- skillCategories: i'm not a big fan of how these are broken down. they are kind of limiting. for example, ruby on rails is both backend and frontend, and I'm not a fan of the concept of backend/frontend in the modern day regardless. they are also a lot uglier than what I had before, but maybe the images arent a great idea either, but it still feels like this is a more soulless version of what i had before. 
- we should also be improving the design of this and bringing it more into the modern era, but maybe that was out of scope for this first pass. 