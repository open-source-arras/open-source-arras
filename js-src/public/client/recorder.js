class AdvancedRecorder extends MediaRecorder {
    constructor(canvas, framePerSecond = 60, fileName = "osa-video.mp4") {
        super(canvas.captureStream(framePerSecond), {
            mimeType: MediaRecorder.isTypeSupported("video/mp4") ? "video/mp4" : "video/webm",
        });
        this.fileName = fileName;
        this.frames = [];
        this.addEventListener("dataavailable", ({ data }) => {
            this.frames.push(data);
        });
    }
    download() {
        let a = new Blob(this.frames, { type: this.mimeType, });
        this.frames.length = 0;
        let k = URL.createObjectURL(a),
            q = document.createElement("a");
        q.style.display = "none";
        q.setAttribute("download", this.fileName);
        q.setAttribute("href", k);
        document.body.appendChild(q);
        setTimeout(() => {
            URL.revokeObjectURL(k);
            document.body.removeChild(q);
        }, 100);
        q.click();
    }
}

export { AdvancedRecorder };