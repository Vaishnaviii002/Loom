Loom

Loom is an AI-powered product delivery platform that helps software teams move from a raw client request to a production-ready feature through a structured workflow:

Request → AI Discovery → PRD → PM Review → Development Tasks → GitHub Pull Request → AI Code Review → Fix Loop → Human Approval → Shipped


Why the name “Loom”?

A loom is a tool used to weave threads together into a complete fabric.

This project uses the same idea for software delivery. In real product teams, work is usually scattered across client messages, support requests, product notes, PRDs, developer tasks, GitHub pull requests, code reviews, and approvals. Loom brings all of those separate threads together and weaves them into one clear delivery workflow.


Core Workflow
Client Request

   ↓
AI Discovery

   ↓
Client-facing PRD

   ↓
Product Manager Review

   ↓
Final PRD

   ↓
AI Development Task Planning

   ↓
Developer Implementation

   ↓
GitHub Pull Request

   ↓
AI Code Review

   ↓
Fix Required / AI Approved

   ↓
Senior Engineer Human Approval



Main Roles

Loom has separate portals for each role.

1. Admin

The Admin manages the workspace, projects, members, repositories, and billing. Admin can not make any changes only verify them.

The Admin can:

-create projects
-connect GitHub repositories
-invite members by link
-assign roles
-assign users to specific projects
-view project members
-open role-specific portals as admin preview
-manage workspace settings
-view billing section


2. Client

The Client raises product requests in simple language.

The Client can:

-select request type
-describe the change they need
-generate an AI-analyzed request
-review AI Discovery output
-submit the request
-add additional information later
-view request details
-generate client-facing PRD
-send PRD to Product Manager

Supported request types include:

-Feature
-Bug
-Change / Update
-Improvement
-New Product
-Example Client Request
-Request type: Change / update

Request:
Update the logo on the landing page.



3. Product Manager

The Product Manager reviews client-generated PRDs and turns them into implementation-ready requirements.

The PM can:

-view PRDs sent by clients
-open a specific PRD
-review AI-generated PRD content
-edit PRD details
-add missing product decisions
-save changes permanently
-finalize the PRD
-send the finalized PRD to AI for task planning
-review AI-generated developer responsibilities
-send approved task cards to the developer portal

The PM does not send the full PRD directly to developers.

Instead:

Final PRD
   ↓
AI analyzes PRD
   ↓
AI creates role-specific development tasks
   ↓
PM reviews tasks
   ↓
PM sends tasks to developers
   ↓
Shipped





4. Developer

The Developer receives task cards created from PM-approved PRDs.

The Developer can:

-view assigned tasks for their project
-understand what needs to be implemented
-see task summary and work items
-see likely affected files if AI provides them
-implement changes in the connected GitHub repository
-create or link a real GitHub pull request
-run AI review against the pull request
-see AI review results
-fix bugs if AI marks the PR as Fix Required
-rerun review after fixes
-move work forward when AI approves
-Example Developer Task
-Task for: Frontend Developer

Implement logo update in landing page




5. Senior Engineer / Human Reviewer

The Senior Engineer is the final human approver.

The Senior Engineer can:

-review AI-approved pull requests
-verify the implementation against the final PRD
-check AI review results
-inspect blocking and non-blocking issues
-approve the work
-reject the implementation
-request changes
-mark the feature complete

This ensures AI supports the workflow, but humans remain the final decision makers.










What AI Does in Loom

AI is used across the full product delivery lifecycle.

AI Discovery

AI analyzes the client request and connected repository context.

It checks:

what the client is asking for
whether the request is clear
whether the feature may already exist
whether more information is needed
which product area may be affected
likely files or modules
change impact
acceptance criteria
follow-up questions

Example:

Client request:
Add pictures to the landing page.

AI may ask:

- Which landing page section should contain the images?
- How many images should be shown?
- Should images be static assets or uploaded by admin?
- Should the layout change on mobile?
AI PRD Generation

AI converts a valid client request into a structured PRD.

A PRD may include:

problem statement
requested change
change impact
acceptance criteria
edge cases
success metrics
additional client details
AI PM Support

AI helps the Product Manager by:

turning unclear PRDs into cleaner requirements
identifying missing details
helping convert PRDs into implementation-ready scope
creating developer responsibility cards
assigning tasks to the correct role

Example:

Request:
Client login fails after accepting invite.

AI may create:

Task for: Backend Developer

Fix invite login flow

- Review invite acceptance route.
- Verify BetterAuth sign-in session creation.
- Confirm client-project access is created.
- Redirect client to the correct project dashboard.
AI Developer Task Planning

AI reads the finalized PRD and creates only the tasks that are actually needed.

It should not assign every task to every role.

Examples:

Logo update
Task for: UI Designer
Prepare updated logo direction and dark-theme visual rules.
Landing page UI change
Task for: Frontend Developer
Implement image section on landing page and keep layout responsive.
Login bug
Task for: Backend Developer
Fix auth/session/invite redirect flow.
Slow dashboard
Task for: Senior Developer
Investigate performance bottleneck and optimize safely.
AI GitHub Pull Request Review

Loom uses real GitHub pull request data.

AI reviews:

actual changed files
actual code diff
final PRD
assigned task details
expected behavior
acceptance criteria

AI should not generate generic comments.

It should only report issues visible in the real PR or clearly required by the PRD.

AI review result can be:

FIX_REQUIRED

or

AI_APPROVED

If blocking bugs are found, the developer fixes the PR and runs review again.








GitHub PR Review Flow
Developer links GitHub PR
   ↓
Loom verifies PR belongs to connected repo
   ↓
Octokit fetches PR metadata
   ↓
Octokit fetches changed files and patches
   ↓
AI reviews diff against PRD and task
   ↓
AI posts review comment on GitHub
   ↓
Loom stores review status




Tech Stack
Next.js App Router
TypeScript
Tailwind CSS
Shadcn-style UI
BetterAuth
Prisma 6.19.0
PostgreSQL / Neon
tRPC monorepo
Octokit
OpenAI
Inngest planned
Razorpay planned
GitHub Webhooks
Vercel deployment planned






