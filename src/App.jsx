/* eslint-disable no-unused-vars */
import "./App.css";
import { useEffect, useRef, useState } from "react";
import { Howl } from "howler";
import * as tf from "@tensorflow/tfjs";
import * as mobilenet from "@tensorflow-models/mobilenet";
import * as knnClassifier from "@tensorflow-models/knn-classifier";
import { initNotifications, notify } from "@mycv/f8-notification";
import soundUrl from "./assets/hey_tay.mp3";
var sound = new Howl({
  src: [soundUrl],
});

function App() {
  // const variable
  const NOT_TOUCH_MODULE = "not_touch";
  const TOUCHED = "touched";
  const TRAINING_TIMES = 50;
  const TOUCHED_PREDICT = 0.8;
  const video = useRef();
  let classifierModule = useRef();
  let mobilenetModule = useRef();
  let canPlaySound = useRef(true);

  const [touched, setTouched] = useState(false);
  useEffect(() => {
    init();
    sound.on("end", function () {
      canPlaySound.current = true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const init = async () => {
    console.log("init...");

    await setUpCamera();
    console.log("setUp camera success");

    classifierModule.current = knnClassifier.create();
    mobilenetModule.current = await mobilenet.load();

    console.log("set up done");
    console.log("Dont touch face and press Train 1 ");

    initNotifications({ cooldown: 3000 });
  };
  //  HIển thị camera trên thiết bị
  const setUpCamera = () => {
    return new Promise((resolve, reject) => {
      navigator.getUserMedia =
        navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia;

      if (navigator.getUserMedia) {
        navigator.getUserMedia(
          { video: true },
          (stream) => {
            video.current.srcObject = stream;
            video.current.addEventListener("loaddedata", resolve());
          },
          (error) => reject()
        );
      } else {
        reject();
      }
    });
  };
  // Bước 1: Train máy khi không chạm tay
  const train = async (label) => {
    console.log(`${label} đang train face cho máy  `);
    for (let i = 0; i < TRAINING_TIMES; i++) {
      console.log(`Progress ${parseInt(((i + 1) / TRAINING_TIMES) * 100)}%`);
      await training(label);
    }
  };
  const sleep = (ms) => {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  };
  // Bước 2: Train máy khi chạm tay
  const training = (label) => {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve) => {
      const embedding = mobilenetModule.current.infer(video.current, true);
      classifierModule.current.addExample(embedding, label);
      await sleep(100);
      resolve();
    });
  };
  // Bước 3:Lấy hình ảnh hiện tại so sánh với hình ảnh đã học trước đó ,
  // Nếu ko khớp thì cảnh báo
  const run = async () => {
    const embedding = mobilenetModule.current.infer(video.current, true);
    const result = await classifierModule.current.predictClass(embedding);

    if (
      result.label === TOUCHED &&
      result.confidences[result.label] > TOUCHED_PREDICT
    ) {
      console.log("touched");
      if (canPlaySound.current) {
        canPlaySound.current = false;
        sound.play();
      }
      notify("Bỏ tay ra", { body: "Bạn vừa chạm tay vào mặt!!!" });
      setTouched(true);
    } else {
      console.log("not_touched");
      setTouched(false);
    }
    await sleep(1000);
    run();
  };
  return (
    <div className={`main ${touched ? "touched" : ""}`}>
      <video ref={video} className="video" autoPlay />
      <div className="control">
        <button onClick={() => train(NOT_TOUCH_MODULE)} className="btn">
          Train 1
        </button>
        <button onClick={() => train(TOUCHED)} className="btn">
          Train 2
        </button>
        <button onClick={() => run()} className="btn">
          Run
        </button>
      </div>
    </div>
  );
}

export default App;
