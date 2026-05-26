export function getRequestIp(request: Request, fallbackScope = "global") {
	const forwardedFor = request.headers.get("x-forwarded-for");
	const realIp = request.headers.get("x-real-ip");
	const cfIp = request.headers.get("cf-connecting-ip");

	const ip =
		forwardedFor?.split(",")[0]?.trim() ||
		realIp?.trim() ||
		cfIp?.trim();

	return ip || `missing-ip:${fallbackScope}`;
}
