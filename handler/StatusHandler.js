
class StatusManager {
    statusArray;
    index;
    constructor() {
        this.statusArray = [];
        this.index = 0;
    }
    Add(status) {
       this.statusArray.push(status);
    }
    Remove(status) {
        const index = this.statusArray.indexOf(status);
        if (index > -1) {
            this.statusArray.splice(index, 1);
        }
    }
    Clear() {
        this.statusArray =[];
    }
    Ready(client, interval) {
        client.user.setActivity("Waiting to process");
        setInterval(() => {
            if (this.statusArray.length == 0) {
                client.user.setActivity("Waiting to process");
            } else {
                if (this.index === this.statusArray.length) this.index = 0;
                if (this.index < this.statusArray.length) {
                    const status = this.statusArray[this.index];
                    client.user.setActivity(status.status, {type: status.type});
                    
                    this.index++;
                }
            }
        }, interval);
    }
}

class Status {
    constructor(status, type) {
        this.status = status;
        this.type = type;
    }
}

module.exports.StatusManager = StatusManager;
module.exports.Status = Status;
