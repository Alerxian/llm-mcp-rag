import chalk from "chalk";

export default function logger(message: string): void {
  const totalLength = 80;
  const padding = Math.max(0, totalLength - message.length - 4); // ==
  const paddingMessage = `${"=".repeat(
    Math.floor(padding / 2)
  )} ${message} ${"=".repeat(Math.ceil(padding / 2))}`;
  console.log(chalk.bold.cyanBright(paddingMessage));
}
