import { useState } from 'react';

export function MascotClips() {
	const mascotVideos = [
		'/bubblepop.mp4',
		'/speaking-edited.mp4',
		'/listening.mp4',
		'/regular-thinking.mp4',
		'/juggling.mp4',
		'/glassadjustment.mp4',
		'/thoughtbubble.mp4',
		'/ballbounce.mp4',
	];

	const [videoIndex, setVideoIndex] = useState(0);

	const playNextVideo = () => {
		setVideoIndex((prev) => (prev + 1) % mascotVideos.length);
	};

	return (
		<div className="mascot-clips-wrap">
			<div className="ripple-effect" aria-hidden="true" />
			<video
				src={mascotVideos[videoIndex]}
				autoPlay
				muted
				playsInline
				preload="auto"
				className="mascot-video video-smooth-transition"
				onEnded={playNextVideo}
				onError={playNextVideo}
			/>
		</div>
	);
}

export default MascotClips;
