const childProcess = require('child_process');
const fs = require('fs');
const http = require('http');
const os = require('os');

class Liquibase {
	constructor(params = {}) {
		const defaultParams = {
			liquibase: `${os.tmpdir()}/liquibase-core.jar`,
			driver: 'org.postgresql.Driver',
			classpath: `${os.tmpdir()}/postgresql-jdbc.jar`
		};
		this.params = Object.assign({}, defaultParams, params);
	}

	get command() {
		let cmd = `java -jar ${this.params.liquibase}`;
		Object.keys(this.params).forEach(key => {
			if (key === 'liquibase') {
				return;
			}
			const value = this.params[key];
			cmd = `${cmd} --${key}=${value}`;
		});
		return cmd;
	}

	exec(command, options = {}) {
		let child;
		let promise = new Promise((resolve, reject) => {
			child = childProcess
				.exec(command, options, (error, stdout, stderr) => {
					if (error) {
						error.stderr = stderr;
						return reject(error);
					}
					resolve({stdout: stdout});
				});
		});
		promise.child = child;
		return promise;
	}

	async run(action = 'update', params = '') {
		await this.downloadDrivers();
		return this.exec(`${this.command} ${action} ${params}`);
	}

	async downloadDrivers() {
		const liquibaseURL = 'http://central.maven.org/maven2/org/liquibase/liquibase-core/3.5.3/liquibase-core-3.5.3.jar';
		const psqlJdbcURL = 'http://central.maven.org/maven2/org/postgresql/postgresql/42.1.4/postgresql-42.1.4.jar';

		if (!fs.existsSync(this.params.liquibase)) {
			return await this.download(liquibaseURL, this.params.liquibase);
		}

		if (!fs.existsSync(this.params.classpath)) {
			return await this.download(psqlJdbcURL, this.params.classpath);
		}
	}

	download(url, dest) {
		return new Promise((resolve, reject) => {
			var file = fs.createWriteStream(dest);
			http.get(url, response => {
				response.pipe(file);
				file.on('finish', () => {
					file.close(resolve);
				});
			}).on('error', err => {
				fs.unlinkSync(dest);
				reject(err);
			});
		});
	}
}

module.exports = params => new Liquibase(params);
