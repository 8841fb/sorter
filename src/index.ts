import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";
import Bun from "bun";

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

	private async processToken(token: string) {
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

			const yearFilePath = path.join(this.outputDir, `${year}.txt`);
			await this.createFileIfNotExists(yearFilePath);
			const yearBunFile = Bun.file(yearFilePath);
			await Bun.write(yearBunFile, fullToken + "\n");

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
				await this.createFileIfNotExists(yearCountFilePath);
				const yearCountBunFile = Bun.file(yearCountFilePath);
				await Bun.write(yearCountBunFile, fullToken + "\n");
			}
		} catch (error) {
			this.handleTokenError(token, error);
		}
	}

	private async handleTokenError(token: string, error: any) {
		const failedFilePath = path.join(this.outputDir, "failed.txt");
		await this.createFileIfNotExists(failedFilePath);
		const failedBunFile = Bun.file(failedFilePath);
		await Bun.write(failedBunFile, token + "\n");
		console.error(chalk.red(`Error - ${token} - ${error}`));
	}

	private async createFileIfNotExists(filePath: string) {
		const directory = path.dirname(filePath);

		if (!fs.existsSync(directory)) {
			fs.mkdirSync(directory, { recursive: true });
		}

		if (!fs.existsSync(filePath)) {
			const bunFile = Bun.file(filePath);
			await Bun.write(bunFile, "");
		}
	}

	public async sortTokens(tokens: string[]) {
		const startTime = Date.now();
		console.log(chalk.yellow("Starting..."));

		await this.createOutputDirectory();

		for (let i = 0; i < tokens.length; i++) {
			const percentDone = Math.floor((i / tokens.length) * 100);
			if (percentDone !== Math.floor((i - 1) / tokens.length) * 100) {
				console.log(chalk.cyan(`${percentDone}% done...`));
			}

			await this.processToken(tokens[i]);
		}

		console.log(
			chalk.green(
				`Finished sorting ${tokens.length} tokens in ${
					(Date.now() - startTime) / 1000
				} seconds!`,
			),
		);
	}
}

async function sortTokens() {
	const sortOptions = {
		sortByDay: false,
		limitTokens: false,
	};

	const inputBunFile = Bun.file("input.txt");
	const tokens: string[] = (await inputBunFile.text()).split("\n");

	const tokenSorter = new TokenSorter(sortOptions);
	await tokenSorter.sortTokens(tokens);
}

sortTokens();
