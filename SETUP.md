# SETUP

> Getting and running this project.

## 01: Set Up Machine (Once Per Machine)

Follow the detailed instructions at:
[**01. Set Up Your Machine**](https://denisecase.github.io/pro-analytics-02/01-set-up-machine/)

## 02: Set Up Project (Once Per Project)

1. Sign in to GitHub, open this repository in your browser, and click **Copy this template** to get a copy in **YOURACCOUNT**.
2. Enable GitHub Pages.
3. Open a **machine terminal** in your `Repos` folder and clone your new repo.
4. Change directory into the repo, open the project in VS Code, and install recommended extensions.
5. Set up a project Python environment (managed by `uv`) and align VS Code with it.

Use the instructions above to get it ALL set up correctly.
Most people open a terminal on their machine (not VS Code), open in their Repos folder and run:

```shell
git clone https://github.com/toy-gpt/toy-gpt-chat.git
cd toy-gpt-chat
code .
```

With the project open in VS Code, open a terminal and run (use **CTRL+c** to stop the local app):

```shell
npm install
npm run dev
```

When VS Code opens, accept the Extension Recommendations (click **`Install All`** or similar when asked).

Use VS Code menu option `Terminal` / `New Terminal` to open a **VS Code terminal** in the root project folder.
Run the following commands, one at a time, hitting ENTER after each:

```shell
uv self update
uv python pin 3.14
uv sync --extra dev --extra docs --upgrade
```

If asked: "We noticed a new environment has been created. Do you want to select it for the workspace folder?" Click **"Yes"**.

Install and run pre-commit checks (repeat the git `add` and `commit` twice if needed):

```shell
uvx pre-commit install
git add -A
uvx pre-commit run --all-files
```

More detailed instructions are available at:
[**02. Set Up Your Project**](https://denisecase.github.io/pro-analytics-02/02-set-up-project/)

## 03: Daily Workflow (Working With Python Project Code)

Commands are provided below to:

1. Git pull
2. Run and check the Python files
3. Build and serve docs
4. Save progress with Git add-commit-push
5. Update project files

VS Code should have only this project (toy-gpt-train) open.
Use VS Code menu option `Terminal` / `New Terminal` and run the following commands:

```shell
git pull
```

Save progress frequently (some tools may make changes; you may need to **re-run git `add` and `commit`** to ensure everything gets committed before pushing):

```shell
git add -A
git commit -m "update"
git push -u origin main
```

## Resources

- [Pro-Analytics-02](<[./docs/pro-tips.md](https://denisecase.github.io/pro-analytics-02/)>) - guide to professional Python
- [ANNOTATIONS.md](./ANNOTATIONS.md) - REQ/WHY/OBS annotations used
- [INSTRUCTORS.md](./docs/root/INSTRUCTORS.md) - guidance and notes for instructors and maintainers
- [POLICIES.md](./docs/root/POLICIES.md) - project rules and expectations that apply to all contributors
- [SE_MANIFEST.toml](./SE_MANIFEST.toml) - project intent, scope, and role

## Citation

[CITATION.cff](./CITATION.cff)

## License

[MIT](./LICENSE)
