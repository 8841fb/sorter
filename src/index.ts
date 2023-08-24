import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";

interface YearFileCount {
	[year: string]: number;
}

class TokenSorter {
	private outputDir: string;
	private yearFileCount: YearFileCount = {};
	private processedTokens: Set<string> = new Set();

	constructor(
		private sortOptions: { sortByDay: boolean; limitTokens: boolean },
	) {
		this.outputDir = this.createOutputDirectory();
	}

	private createOutputDirectory(): string {
		const formattedDate = new Date()
			.toISOString()
			.replace(/:/g, "-")
			.split(".")[0];
		const outputDir = path.join("output", formattedDate);
		fs.mkdirSync(outputDir, { recursive: true });
		return outputDir;
	}

	private processToken(token: string) {
		if (this.processedTokens.has(token)) {
			return;
		}

		this.processedTokens.add(token);

		if (!token.trim()) {
			return;
		}

		try {
			const fullToken: string = token;
			if (token.includes(":")) {
				token = token.split(":")[2];
			}

			const userid: string = Buffer.from(
				token.split(".")[0] + "==",
				"base64",
			).toString("utf-8");
			const creationdate_unix: number =
				parseInt(Number(userid).toString(2).slice(0, -22), 2) + 1420070400000;

			const dateObj = new Date(creationdate_unix);
			const year = dateObj.getFullYear().toString();
			const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");
			const day = this.sortOptions.sortByDay
				? dateObj.getDate().toString().padStart(2, "0")
				: "";

			const yearFilePath = path.join(this.outputDir, `${year}.txt`);
			this.createFileIfNotExists(yearFilePath);
			fs.appendFileSync(yearFilePath, fullToken + "\n");

			if (this.sortOptions.sortByDay) {
				if (!this.yearFileCount[year]) {
					this.yearFileCount[year] = 0;
				}
				this.yearFileCount[year]++;
				const yearCount = Math.floor(this.yearFileCount[year] / 10);
				const yearCountFilePath = path.join(
					this.outputDir,
					`${year} #${yearCount}.txt`,
				);
				this.createFileIfNotExists(yearCountFilePath);
				fs.appendFileSync(yearCountFilePath, fullToken + "\n");
			}
		} catch (error) {
			this.handleTokenError(token, error);
		}
	}

	private handleTokenError(token: string, error: any) {
		const failedFilePath = path.join(this.outputDir, "failed.txt");
		this.createFileIfNotExists(failedFilePath);
		fs.appendFileSync(failedFilePath, token + "\n");
		console.error(chalk.red(`Error - ${token} - ${error}`));
	}

	private createFileIfNotExists(filePath: string) {
		const directory = path.dirname(filePath);
		if (!fs.existsSync(directory)) {
			fs.mkdirSync(directory, { recursive: true });
		}
		if (!fs.existsSync(filePath)) {
			fs.writeFileSync(filePath, "");
		}
	}

	public sortTokens(tokens: string[]) {
		const startTime = Date.now();
		console.log(chalk.yellow("Starting..."));

		this.createOutputDirectory();

		tokens.forEach((token, i) => {
			const percentDone = Math.floor((i / tokens.length) * 100);
			if (percentDone !== Math.floor((i - 1) / tokens.length) * 100) {
				console.log(chalk.cyan(`${percentDone}% done...`));
			}

			this.processToken(token);
		});

		console.log(
			chalk.green(
				`Finished sorting ${tokens.length} tokens in ${
					(Date.now() - startTime) / 1000
				} seconds!`,
			),
		);
	}
}

function sortTokens() {
	const sortOptions = {
		sortByDay: false,
		limitTokens: false,
	};

	const tokens: string[] = fs.readFileSync("input.txt", "utf-8").split("\n");

	const tokenSorter = new TokenSorter(sortOptions);
	tokenSorter.sortTokens(tokens);
}

sortTokens();
