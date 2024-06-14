class QUEUE {
	constructor(opts) {
		if (!opts.name) return console.error("please specify name for queue");
		this.interval = opts.interval || 0;

		this.procPerSec = 1000/this.interval;
		this.tasks = [];
		this.setNextTimeout();
		this.now = Date.now();
		this.countProceed = 0;
	}

	async proceed() {
		if (!this.tasks.length) return this.setNextTimeout();

		let task = this.tasks.shift();

		if(Date.now() - this.now < 1000){
			this.countProceed++;
		} else {
			this.countProceed = 0;
			this.now = Date.now();
		}
		await task();
		this.setNextTimeout();
	}

	proceedAsync() {
		if (!this.tasks.length) return this.setNextTimeout();

		let task = this.tasks.shift();

		if(Date.now() - this.now < 1000){
			this.countProceed++;
		} else {
			this.countProceed = 0;
			this.now = Date.now();
		}
		task();
		this.setNextTimeout();
	}

	setNextTimeout() {
		if(this.countProceed < this.procPerSec){
			setTimeout(this.proceed.bind(this), 5);
		}else {
			let timeToWaite = 1005 - (Date.now() - this.now);
			if(timeToWaite > 0){
				setTimeout(this.proceed.bind(this), timeToWaite);
			}else {
				setTimeout(this.proceed.bind(this), 5);
			}
		}
	}

	addTask(f) {
		this.tasks.push(f);
		return this.tasks.length;

	}
	get getinterval(){
		return this.interval;
	}
	set setinterval(time){
		this.interval = time;
	}

}

export default QUEUE;