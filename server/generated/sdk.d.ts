import { Dirent, Stats } from 'node:fs';
import { Readable, Writable } from 'node:stream';
import { z } from 'zod';

//#region src/api-client/validators.d.ts
export type SessionMetaData = z.infer<typeof Session>;
declare const Session: z.ZodObject<{
	id: z.ZodString;
	memory: z.ZodNumber;
	vcpus: z.ZodNumber;
	region: z.ZodString;
	runtime: z.ZodOptional<z.ZodString>;
	timeout: z.ZodNumber;
	status: z.ZodEnum<{
		pending: "pending";
		running: "running";
		stopping: "stopping";
		stopped: "stopped";
		failed: "failed";
		aborted: "aborted";
		snapshotting: "snapshotting";
	}>;
	requestedAt: z.ZodNumber;
	startedAt: z.ZodOptional<z.ZodNumber>;
	requestedStopAt: z.ZodOptional<z.ZodNumber>;
	stoppedAt: z.ZodOptional<z.ZodNumber>;
	abortedAt: z.ZodOptional<z.ZodNumber>;
	duration: z.ZodOptional<z.ZodNumber>;
	sourceSnapshotId: z.ZodOptional<z.ZodString>;
	snapshottedAt: z.ZodOptional<z.ZodNumber>;
	createdAt: z.ZodNumber;
	cwd: z.ZodString;
	updatedAt: z.ZodNumber;
	interactivePort: z.ZodOptional<z.ZodNumber>;
	networkPolicy: z.ZodOptional<z.ZodUnion<readonly [
		z.ZodUnion<readonly [
			z.ZodObject<{
				mode: z.ZodLiteral<"allow-all">;
			}, z.core.$loose>,
			z.ZodObject<{
				mode: z.ZodLiteral<"deny-all">;
			}, z.core.$loose>
		]>,
		z.ZodObject<{
			mode: z.ZodLiteral<"custom">;
			allowedDomains: z.ZodOptional<z.ZodArray<z.ZodString>>;
			allowedCIDRs: z.ZodOptional<z.ZodArray<z.ZodString>>;
			deniedCIDRs: z.ZodOptional<z.ZodArray<z.ZodString>>;
			injectionRules: z.ZodOptional<z.ZodArray<z.ZodObject<{
				domain: z.ZodString;
				headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
				headerNames: z.ZodOptional<z.ZodArray<z.ZodString>>;
				match: z.ZodOptional<z.ZodObject<{
					path: z.ZodOptional<z.ZodObject<{
						exact: z.ZodOptional<z.ZodString>;
						startsWith: z.ZodOptional<z.ZodString>;
						regex: z.ZodOptional<z.ZodString>;
					}, z.core.$strip>>;
					method: z.ZodOptional<z.ZodArray<z.ZodString>>;
					queryString: z.ZodOptional<z.ZodArray<z.ZodObject<{
						key: z.ZodOptional<z.ZodObject<{
							exact: z.ZodOptional<z.ZodString>;
							startsWith: z.ZodOptional<z.ZodString>;
							regex: z.ZodOptional<z.ZodString>;
						}, z.core.$strip>>;
						value: z.ZodOptional<z.ZodObject<{
							exact: z.ZodOptional<z.ZodString>;
							startsWith: z.ZodOptional<z.ZodString>;
							regex: z.ZodOptional<z.ZodString>;
						}, z.core.$strip>>;
					}, z.core.$strip>>>;
					headers: z.ZodOptional<z.ZodArray<z.ZodObject<{
						key: z.ZodOptional<z.ZodObject<{
							exact: z.ZodOptional<z.ZodString>;
							startsWith: z.ZodOptional<z.ZodString>;
							regex: z.ZodOptional<z.ZodString>;
						}, z.core.$strip>>;
						value: z.ZodOptional<z.ZodObject<{
							exact: z.ZodOptional<z.ZodString>;
							startsWith: z.ZodOptional<z.ZodString>;
							regex: z.ZodOptional<z.ZodString>;
						}, z.core.$strip>>;
					}, z.core.$strip>>>;
				}, z.core.$strip>>;
			}, z.core.$strip>>>;
			forwardRules: z.ZodOptional<z.ZodArray<z.ZodObject<{
				domain: z.ZodString;
				forwardURL: z.ZodString;
				match: z.ZodOptional<z.ZodObject<{
					path: z.ZodOptional<z.ZodObject<{
						exact: z.ZodOptional<z.ZodString>;
						startsWith: z.ZodOptional<z.ZodString>;
						regex: z.ZodOptional<z.ZodString>;
					}, z.core.$strip>>;
					method: z.ZodOptional<z.ZodArray<z.ZodString>>;
					queryString: z.ZodOptional<z.ZodArray<z.ZodObject<{
						key: z.ZodOptional<z.ZodObject<{
							exact: z.ZodOptional<z.ZodString>;
							startsWith: z.ZodOptional<z.ZodString>;
							regex: z.ZodOptional<z.ZodString>;
						}, z.core.$strip>>;
						value: z.ZodOptional<z.ZodObject<{
							exact: z.ZodOptional<z.ZodString>;
							startsWith: z.ZodOptional<z.ZodString>;
							regex: z.ZodOptional<z.ZodString>;
						}, z.core.$strip>>;
					}, z.core.$strip>>>;
					headers: z.ZodOptional<z.ZodArray<z.ZodObject<{
						key: z.ZodOptional<z.ZodObject<{
							exact: z.ZodOptional<z.ZodString>;
							startsWith: z.ZodOptional<z.ZodString>;
							regex: z.ZodOptional<z.ZodString>;
						}, z.core.$strip>>;
						value: z.ZodOptional<z.ZodObject<{
							exact: z.ZodOptional<z.ZodString>;
							startsWith: z.ZodOptional<z.ZodString>;
							regex: z.ZodOptional<z.ZodString>;
						}, z.core.$strip>>;
					}, z.core.$strip>>>;
				}, z.core.$strip>>;
			}, z.core.$strip>>>;
		}, z.core.$loose>
	]>>;
	activeCpuDurationMs: z.ZodOptional<z.ZodNumber>;
	networkTransfer: z.ZodOptional<z.ZodObject<{
		ingress: z.ZodNumber;
		egress: z.ZodNumber;
	}, z.core.$strip>>;
}, z.core.$strip>;
export type SandboxRouteData = z.infer<typeof SandboxRoute>;
declare const SandboxRoute: z.ZodObject<{
	url: z.ZodString;
	subdomain: z.ZodString;
	port: z.ZodNumber;
}, z.core.$strip>;
export type SnapshotMetadata = z.infer<typeof Snapshot>;
declare const Snapshot: z.ZodObject<{
	id: z.ZodString;
	sourceSessionId: z.ZodString;
	region: z.ZodString;
	regions: z.ZodOptional<z.ZodArray<z.ZodString>>;
	status: z.ZodEnum<{
		failed: "failed";
		created: "created";
		deleted: "deleted";
	}>;
	sizeBytes: z.ZodNumber;
	expiresAt: z.ZodOptional<z.ZodNumber>;
	createdAt: z.ZodNumber;
	updatedAt: z.ZodNumber;
	lastUsedAt: z.ZodOptional<z.ZodNumber>;
	creationMethod: z.ZodOptional<z.ZodString>;
	parentId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type CommandData = z.infer<typeof Command>;
declare const Command: z.ZodObject<{
	id: z.ZodString;
	name: z.ZodString;
	args: z.ZodArray<z.ZodString>;
	cwd: z.ZodString;
	sessionId: z.ZodString;
	exitCode: z.ZodNullable<z.ZodNumber>;
	durationMs: z.ZodOptional<z.ZodNumber>;
	startedAt: z.ZodNumber;
}, z.core.$strip>;
declare const SessionResponse: z.ZodObject<{
	session: z.ZodObject<{
		id: z.ZodString;
		memory: z.ZodNumber;
		vcpus: z.ZodNumber;
		region: z.ZodString;
		runtime: z.ZodOptional<z.ZodString>;
		timeout: z.ZodNumber;
		status: z.ZodEnum<{
			pending: "pending";
			running: "running";
			stopping: "stopping";
			stopped: "stopped";
			failed: "failed";
			aborted: "aborted";
			snapshotting: "snapshotting";
		}>;
		requestedAt: z.ZodNumber;
		startedAt: z.ZodOptional<z.ZodNumber>;
		requestedStopAt: z.ZodOptional<z.ZodNumber>;
		stoppedAt: z.ZodOptional<z.ZodNumber>;
		abortedAt: z.ZodOptional<z.ZodNumber>;
		duration: z.ZodOptional<z.ZodNumber>;
		sourceSnapshotId: z.ZodOptional<z.ZodString>;
		snapshottedAt: z.ZodOptional<z.ZodNumber>;
		createdAt: z.ZodNumber;
		cwd: z.ZodString;
		updatedAt: z.ZodNumber;
		interactivePort: z.ZodOptional<z.ZodNumber>;
		networkPolicy: z.ZodOptional<z.ZodUnion<readonly [
			z.ZodUnion<readonly [
				z.ZodObject<{
					mode: z.ZodLiteral<"allow-all">;
				}, z.core.$loose>,
				z.ZodObject<{
					mode: z.ZodLiteral<"deny-all">;
				}, z.core.$loose>
			]>,
			z.ZodObject<{
				mode: z.ZodLiteral<"custom">;
				allowedDomains: z.ZodOptional<z.ZodArray<z.ZodString>>;
				allowedCIDRs: z.ZodOptional<z.ZodArray<z.ZodString>>;
				deniedCIDRs: z.ZodOptional<z.ZodArray<z.ZodString>>;
				injectionRules: z.ZodOptional<z.ZodArray<z.ZodObject<{
					domain: z.ZodString;
					headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
					headerNames: z.ZodOptional<z.ZodArray<z.ZodString>>;
					match: z.ZodOptional<z.ZodObject<{
						path: z.ZodOptional<z.ZodObject<{
							exact: z.ZodOptional<z.ZodString>;
							startsWith: z.ZodOptional<z.ZodString>;
							regex: z.ZodOptional<z.ZodString>;
						}, z.core.$strip>>;
						method: z.ZodOptional<z.ZodArray<z.ZodString>>;
						queryString: z.ZodOptional<z.ZodArray<z.ZodObject<{
							key: z.ZodOptional<z.ZodObject<{
								exact: z.ZodOptional<z.ZodString>;
								startsWith: z.ZodOptional<z.ZodString>;
								regex: z.ZodOptional<z.ZodString>;
							}, z.core.$strip>>;
							value: z.ZodOptional<z.ZodObject<{
								exact: z.ZodOptional<z.ZodString>;
								startsWith: z.ZodOptional<z.ZodString>;
								regex: z.ZodOptional<z.ZodString>;
							}, z.core.$strip>>;
						}, z.core.$strip>>>;
						headers: z.ZodOptional<z.ZodArray<z.ZodObject<{
							key: z.ZodOptional<z.ZodObject<{
								exact: z.ZodOptional<z.ZodString>;
								startsWith: z.ZodOptional<z.ZodString>;
								regex: z.ZodOptional<z.ZodString>;
							}, z.core.$strip>>;
							value: z.ZodOptional<z.ZodObject<{
								exact: z.ZodOptional<z.ZodString>;
								startsWith: z.ZodOptional<z.ZodString>;
								regex: z.ZodOptional<z.ZodString>;
							}, z.core.$strip>>;
						}, z.core.$strip>>>;
					}, z.core.$strip>>;
				}, z.core.$strip>>>;
				forwardRules: z.ZodOptional<z.ZodArray<z.ZodObject<{
					domain: z.ZodString;
					forwardURL: z.ZodString;
					match: z.ZodOptional<z.ZodObject<{
						path: z.ZodOptional<z.ZodObject<{
							exact: z.ZodOptional<z.ZodString>;
							startsWith: z.ZodOptional<z.ZodString>;
							regex: z.ZodOptional<z.ZodString>;
						}, z.core.$strip>>;
						method: z.ZodOptional<z.ZodArray<z.ZodString>>;
						queryString: z.ZodOptional<z.ZodArray<z.ZodObject<{
							key: z.ZodOptional<z.ZodObject<{
								exact: z.ZodOptional<z.ZodString>;
								startsWith: z.ZodOptional<z.ZodString>;
								regex: z.ZodOptional<z.ZodString>;
							}, z.core.$strip>>;
							value: z.ZodOptional<z.ZodObject<{
								exact: z.ZodOptional<z.ZodString>;
								startsWith: z.ZodOptional<z.ZodString>;
								regex: z.ZodOptional<z.ZodString>;
							}, z.core.$strip>>;
						}, z.core.$strip>>>;
						headers: z.ZodOptional<z.ZodArray<z.ZodObject<{
							key: z.ZodOptional<z.ZodObject<{
								exact: z.ZodOptional<z.ZodString>;
								startsWith: z.ZodOptional<z.ZodString>;
								regex: z.ZodOptional<z.ZodString>;
							}, z.core.$strip>>;
							value: z.ZodOptional<z.ZodObject<{
								exact: z.ZodOptional<z.ZodString>;
								startsWith: z.ZodOptional<z.ZodString>;
								regex: z.ZodOptional<z.ZodString>;
							}, z.core.$strip>>;
						}, z.core.$strip>>>;
					}, z.core.$strip>>;
				}, z.core.$strip>>>;
			}, z.core.$loose>
		]>>;
		activeCpuDurationMs: z.ZodOptional<z.ZodNumber>;
		networkTransfer: z.ZodOptional<z.ZodObject<{
			ingress: z.ZodNumber;
			egress: z.ZodNumber;
		}, z.core.$strip>>;
	}, z.core.$loose>;
}, z.core.$strip>;
declare const InteractiveSessionResponse: z.ZodObject<{
	url: z.ZodString;
	token: z.ZodString;
}, z.core.$strip>;
declare const CommandResponse: z.ZodObject<{
	command: z.ZodObject<{
		id: z.ZodString;
		name: z.ZodString;
		args: z.ZodArray<z.ZodString>;
		cwd: z.ZodString;
		sessionId: z.ZodString;
		exitCode: z.ZodNullable<z.ZodNumber>;
		durationMs: z.ZodOptional<z.ZodNumber>;
		startedAt: z.ZodNumber;
	}, z.core.$strip>;
}, z.core.$strip>;
export type CommandFinishedData = z.infer<typeof CommandFinishedResponse>["command"];
declare const CommandFinishedResponse: z.ZodObject<{
	command: z.ZodObject<{
		id: z.ZodString;
		name: z.ZodString;
		args: z.ZodArray<z.ZodString>;
		cwd: z.ZodString;
		sessionId: z.ZodString;
		durationMs: z.ZodOptional<z.ZodNumber>;
		startedAt: z.ZodNumber;
		exitCode: z.ZodNumber;
	}, z.core.$strip>;
}, z.core.$strip>;
declare const LogError: z.ZodObject<{
	stream: z.ZodLiteral<"error">;
	data: z.ZodObject<{
		code: z.ZodString;
		message: z.ZodString;
	}, z.core.$strip>;
}, z.core.$strip>;
declare const LogLine: z.ZodDiscriminatedUnion<[
	z.ZodObject<{
		data: z.ZodString;
		stream: z.ZodLiteral<"stdout">;
	}, z.core.$strip>,
	z.ZodObject<{
		data: z.ZodString;
		stream: z.ZodLiteral<"stderr">;
	}, z.core.$strip>,
	z.ZodObject<{
		stream: z.ZodLiteral<"error">;
		data: z.ZodObject<{
			code: z.ZodString;
			message: z.ZodString;
		}, z.core.$strip>;
	}, z.core.$strip>
], "stream">;
export type LogLineData = z.infer<typeof LogLine>;
export type LogOutputLine = Exclude<LogLineData, z.infer<typeof LogError>>;
declare const CreateSnapshotResponse: z.ZodObject<{
	snapshot: z.ZodObject<{
		id: z.ZodString;
		sourceSessionId: z.ZodString;
		region: z.ZodString;
		regions: z.ZodOptional<z.ZodArray<z.ZodString>>;
		status: z.ZodEnum<{
			failed: "failed";
			created: "created";
			deleted: "deleted";
		}>;
		sizeBytes: z.ZodNumber;
		expiresAt: z.ZodOptional<z.ZodNumber>;
		createdAt: z.ZodNumber;
		updatedAt: z.ZodNumber;
		lastUsedAt: z.ZodOptional<z.ZodNumber>;
		creationMethod: z.ZodOptional<z.ZodString>;
		parentId: z.ZodOptional<z.ZodString>;
	}, z.core.$strip>;
	session: z.ZodObject<{
		id: z.ZodString;
		memory: z.ZodNumber;
		vcpus: z.ZodNumber;
		region: z.ZodString;
		runtime: z.ZodOptional<z.ZodString>;
		timeout: z.ZodNumber;
		status: z.ZodEnum<{
			pending: "pending";
			running: "running";
			stopping: "stopping";
			stopped: "stopped";
			failed: "failed";
			aborted: "aborted";
			snapshotting: "snapshotting";
		}>;
		requestedAt: z.ZodNumber;
		startedAt: z.ZodOptional<z.ZodNumber>;
		requestedStopAt: z.ZodOptional<z.ZodNumber>;
		stoppedAt: z.ZodOptional<z.ZodNumber>;
		abortedAt: z.ZodOptional<z.ZodNumber>;
		duration: z.ZodOptional<z.ZodNumber>;
		sourceSnapshotId: z.ZodOptional<z.ZodString>;
		snapshottedAt: z.ZodOptional<z.ZodNumber>;
		createdAt: z.ZodNumber;
		cwd: z.ZodString;
		updatedAt: z.ZodNumber;
		interactivePort: z.ZodOptional<z.ZodNumber>;
		networkPolicy: z.ZodOptional<z.ZodUnion<readonly [
			z.ZodUnion<readonly [
				z.ZodObject<{
					mode: z.ZodLiteral<"allow-all">;
				}, z.core.$loose>,
				z.ZodObject<{
					mode: z.ZodLiteral<"deny-all">;
				}, z.core.$loose>
			]>,
			z.ZodObject<{
				mode: z.ZodLiteral<"custom">;
				allowedDomains: z.ZodOptional<z.ZodArray<z.ZodString>>;
				allowedCIDRs: z.ZodOptional<z.ZodArray<z.ZodString>>;
				deniedCIDRs: z.ZodOptional<z.ZodArray<z.ZodString>>;
				injectionRules: z.ZodOptional<z.ZodArray<z.ZodObject<{
					domain: z.ZodString;
					headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
					headerNames: z.ZodOptional<z.ZodArray<z.ZodString>>;
					match: z.ZodOptional<z.ZodObject<{
						path: z.ZodOptional<z.ZodObject<{
							exact: z.ZodOptional<z.ZodString>;
							startsWith: z.ZodOptional<z.ZodString>;
							regex: z.ZodOptional<z.ZodString>;
						}, z.core.$strip>>;
						method: z.ZodOptional<z.ZodArray<z.ZodString>>;
						queryString: z.ZodOptional<z.ZodArray<z.ZodObject<{
							key: z.ZodOptional<z.ZodObject<{
								exact: z.ZodOptional<z.ZodString>;
								startsWith: z.ZodOptional<z.ZodString>;
								regex: z.ZodOptional<z.ZodString>;
							}, z.core.$strip>>;
							value: z.ZodOptional<z.ZodObject<{
								exact: z.ZodOptional<z.ZodString>;
								startsWith: z.ZodOptional<z.ZodString>;
								regex: z.ZodOptional<z.ZodString>;
							}, z.core.$strip>>;
						}, z.core.$strip>>>;
						headers: z.ZodOptional<z.ZodArray<z.ZodObject<{
							key: z.ZodOptional<z.ZodObject<{
								exact: z.ZodOptional<z.ZodString>;
								startsWith: z.ZodOptional<z.ZodString>;
								regex: z.ZodOptional<z.ZodString>;
							}, z.core.$strip>>;
							value: z.ZodOptional<z.ZodObject<{
								exact: z.ZodOptional<z.ZodString>;
								startsWith: z.ZodOptional<z.ZodString>;
								regex: z.ZodOptional<z.ZodString>;
							}, z.core.$strip>>;
						}, z.core.$strip>>>;
					}, z.core.$strip>>;
				}, z.core.$strip>>>;
				forwardRules: z.ZodOptional<z.ZodArray<z.ZodObject<{
					domain: z.ZodString;
					forwardURL: z.ZodString;
					match: z.ZodOptional<z.ZodObject<{
						path: z.ZodOptional<z.ZodObject<{
							exact: z.ZodOptional<z.ZodString>;
							startsWith: z.ZodOptional<z.ZodString>;
							regex: z.ZodOptional<z.ZodString>;
						}, z.core.$strip>>;
						method: z.ZodOptional<z.ZodArray<z.ZodString>>;
						queryString: z.ZodOptional<z.ZodArray<z.ZodObject<{
							key: z.ZodOptional<z.ZodObject<{
								exact: z.ZodOptional<z.ZodString>;
								startsWith: z.ZodOptional<z.ZodString>;
								regex: z.ZodOptional<z.ZodString>;
							}, z.core.$strip>>;
							value: z.ZodOptional<z.ZodObject<{
								exact: z.ZodOptional<z.ZodString>;
								startsWith: z.ZodOptional<z.ZodString>;
								regex: z.ZodOptional<z.ZodString>;
							}, z.core.$strip>>;
						}, z.core.$strip>>>;
						headers: z.ZodOptional<z.ZodArray<z.ZodObject<{
							key: z.ZodOptional<z.ZodObject<{
								exact: z.ZodOptional<z.ZodString>;
								startsWith: z.ZodOptional<z.ZodString>;
								regex: z.ZodOptional<z.ZodString>;
							}, z.core.$strip>>;
							value: z.ZodOptional<z.ZodObject<{
								exact: z.ZodOptional<z.ZodString>;
								startsWith: z.ZodOptional<z.ZodString>;
								regex: z.ZodOptional<z.ZodString>;
							}, z.core.$strip>>;
						}, z.core.$strip>>>;
					}, z.core.$strip>>;
				}, z.core.$strip>>>;
			}, z.core.$loose>
		]>>;
		activeCpuDurationMs: z.ZodOptional<z.ZodNumber>;
		networkTransfer: z.ZodOptional<z.ZodObject<{
			ingress: z.ZodNumber;
			egress: z.ZodNumber;
		}, z.core.$strip>>;
	}, z.core.$loose>;
}, z.core.$strip>;
declare const SnapshotResponse: z.ZodObject<{
	snapshot: z.ZodObject<{
		id: z.ZodString;
		sourceSessionId: z.ZodString;
		region: z.ZodString;
		regions: z.ZodOptional<z.ZodArray<z.ZodString>>;
		status: z.ZodEnum<{
			failed: "failed";
			created: "created";
			deleted: "deleted";
		}>;
		sizeBytes: z.ZodNumber;
		expiresAt: z.ZodOptional<z.ZodNumber>;
		createdAt: z.ZodNumber;
		updatedAt: z.ZodNumber;
		lastUsedAt: z.ZodOptional<z.ZodNumber>;
		creationMethod: z.ZodOptional<z.ZodString>;
		parentId: z.ZodOptional<z.ZodString>;
	}, z.core.$strip>;
}, z.core.$strip>;
declare const Drive: z.ZodObject<{
	id: z.ZodString;
	name: z.ZodString;
	projectId: z.ZodString;
	region: z.ZodString;
	maxSizeBytes: z.ZodNumber;
	currentSessionId: z.ZodOptional<z.ZodString>;
	currentSandboxName: z.ZodOptional<z.ZodString>;
	createdAt: z.ZodNumber;
	updatedAt: z.ZodNumber;
}, z.core.$strip>;
export type DriveMetadata = z.infer<typeof Drive>;
declare const Sandbox: z.ZodObject<{
	name: z.ZodString;
	persistent: z.ZodBoolean;
	region: z.ZodOptional<z.ZodString>;
	failoverRegions: z.ZodOptional<z.ZodArray<z.ZodString>>;
	vcpus: z.ZodOptional<z.ZodNumber>;
	memory: z.ZodOptional<z.ZodNumber>;
	runtime: z.ZodOptional<z.ZodString>;
	image: z.ZodOptional<z.ZodString>;
	timeout: z.ZodOptional<z.ZodNumber>;
	networkPolicy: z.ZodOptional<z.ZodUnion<readonly [
		z.ZodUnion<readonly [
			z.ZodObject<{
				mode: z.ZodLiteral<"allow-all">;
			}, z.core.$loose>,
			z.ZodObject<{
				mode: z.ZodLiteral<"deny-all">;
			}, z.core.$loose>
		]>,
		z.ZodObject<{
			mode: z.ZodLiteral<"custom">;
			allowedDomains: z.ZodOptional<z.ZodArray<z.ZodString>>;
			allowedCIDRs: z.ZodOptional<z.ZodArray<z.ZodString>>;
			deniedCIDRs: z.ZodOptional<z.ZodArray<z.ZodString>>;
			injectionRules: z.ZodOptional<z.ZodArray<z.ZodObject<{
				domain: z.ZodString;
				headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
				headerNames: z.ZodOptional<z.ZodArray<z.ZodString>>;
				match: z.ZodOptional<z.ZodObject<{
					path: z.ZodOptional<z.ZodObject<{
						exact: z.ZodOptional<z.ZodString>;
						startsWith: z.ZodOptional<z.ZodString>;
						regex: z.ZodOptional<z.ZodString>;
					}, z.core.$strip>>;
					method: z.ZodOptional<z.ZodArray<z.ZodString>>;
					queryString: z.ZodOptional<z.ZodArray<z.ZodObject<{
						key: z.ZodOptional<z.ZodObject<{
							exact: z.ZodOptional<z.ZodString>;
							startsWith: z.ZodOptional<z.ZodString>;
							regex: z.ZodOptional<z.ZodString>;
						}, z.core.$strip>>;
						value: z.ZodOptional<z.ZodObject<{
							exact: z.ZodOptional<z.ZodString>;
							startsWith: z.ZodOptional<z.ZodString>;
							regex: z.ZodOptional<z.ZodString>;
						}, z.core.$strip>>;
					}, z.core.$strip>>>;
					headers: z.ZodOptional<z.ZodArray<z.ZodObject<{
						key: z.ZodOptional<z.ZodObject<{
							exact: z.ZodOptional<z.ZodString>;
							startsWith: z.ZodOptional<z.ZodString>;
							regex: z.ZodOptional<z.ZodString>;
						}, z.core.$strip>>;
						value: z.ZodOptional<z.ZodObject<{
							exact: z.ZodOptional<z.ZodString>;
							startsWith: z.ZodOptional<z.ZodString>;
							regex: z.ZodOptional<z.ZodString>;
						}, z.core.$strip>>;
					}, z.core.$strip>>>;
				}, z.core.$strip>>;
			}, z.core.$strip>>>;
			forwardRules: z.ZodOptional<z.ZodArray<z.ZodObject<{
				domain: z.ZodString;
				forwardURL: z.ZodString;
				match: z.ZodOptional<z.ZodObject<{
					path: z.ZodOptional<z.ZodObject<{
						exact: z.ZodOptional<z.ZodString>;
						startsWith: z.ZodOptional<z.ZodString>;
						regex: z.ZodOptional<z.ZodString>;
					}, z.core.$strip>>;
					method: z.ZodOptional<z.ZodArray<z.ZodString>>;
					queryString: z.ZodOptional<z.ZodArray<z.ZodObject<{
						key: z.ZodOptional<z.ZodObject<{
							exact: z.ZodOptional<z.ZodString>;
							startsWith: z.ZodOptional<z.ZodString>;
							regex: z.ZodOptional<z.ZodString>;
						}, z.core.$strip>>;
						value: z.ZodOptional<z.ZodObject<{
							exact: z.ZodOptional<z.ZodString>;
							startsWith: z.ZodOptional<z.ZodString>;
							regex: z.ZodOptional<z.ZodString>;
						}, z.core.$strip>>;
					}, z.core.$strip>>>;
					headers: z.ZodOptional<z.ZodArray<z.ZodObject<{
						key: z.ZodOptional<z.ZodObject<{
							exact: z.ZodOptional<z.ZodString>;
							startsWith: z.ZodOptional<z.ZodString>;
							regex: z.ZodOptional<z.ZodString>;
						}, z.core.$strip>>;
						value: z.ZodOptional<z.ZodObject<{
							exact: z.ZodOptional<z.ZodString>;
							startsWith: z.ZodOptional<z.ZodString>;
							regex: z.ZodOptional<z.ZodString>;
						}, z.core.$strip>>;
					}, z.core.$strip>>>;
				}, z.core.$strip>>;
			}, z.core.$strip>>>;
		}, z.core.$loose>
	]>>;
	totalEgressBytes: z.ZodOptional<z.ZodNumber>;
	totalIngressBytes: z.ZodOptional<z.ZodNumber>;
	totalActiveCpuDurationMs: z.ZodOptional<z.ZodNumber>;
	totalDurationMs: z.ZodOptional<z.ZodNumber>;
	createdAt: z.ZodNumber;
	updatedAt: z.ZodNumber;
	expiresAt: z.ZodOptional<z.ZodNumber>;
	currentSessionId: z.ZodString;
	currentSnapshotId: z.ZodOptional<z.ZodString>;
	status: z.ZodEnum<{
		pending: "pending";
		running: "running";
		stopping: "stopping";
		stopped: "stopped";
		failed: "failed";
		aborted: "aborted";
		snapshotting: "snapshotting";
	}>;
	statusUpdatedAt: z.ZodOptional<z.ZodNumber>;
	cwd: z.ZodOptional<z.ZodString>;
	tags: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
	mounts: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodPipe<z.ZodObject<{
		drive: z.ZodString;
		mode: z.ZodOptional<z.ZodEnum<{
			snapshot: "snapshot";
			"read-write": "read-write";
			"read-only": "read-only";
		}>>;
	}, z.core.$strip>, z.ZodTransform<{
		drive: string;
		mode: "snapshot" | "read-write";
	}, {
		drive: string;
		mode?: "snapshot" | "read-write" | "read-only" | undefined;
	}>>>>;
	snapshotExpiration: z.ZodOptional<z.ZodNumber>;
	keepLastSnapshots: z.ZodOptional<z.ZodObject<{
		count: z.ZodNumber;
		expiration: z.ZodOptional<z.ZodNumber>;
		deleteEvicted: z.ZodOptional<z.ZodBoolean>;
	}, z.core.$strip>>;
}, z.core.$strip>;
export type SandboxMetaData = z.infer<typeof Sandbox>;
declare const StopSessionResponse: z.ZodObject<{
	session: z.ZodObject<{
		id: z.ZodString;
		memory: z.ZodNumber;
		vcpus: z.ZodNumber;
		region: z.ZodString;
		runtime: z.ZodOptional<z.ZodString>;
		timeout: z.ZodNumber;
		status: z.ZodEnum<{
			pending: "pending";
			running: "running";
			stopping: "stopping";
			stopped: "stopped";
			failed: "failed";
			aborted: "aborted";
			snapshotting: "snapshotting";
		}>;
		requestedAt: z.ZodNumber;
		startedAt: z.ZodOptional<z.ZodNumber>;
		requestedStopAt: z.ZodOptional<z.ZodNumber>;
		stoppedAt: z.ZodOptional<z.ZodNumber>;
		abortedAt: z.ZodOptional<z.ZodNumber>;
		duration: z.ZodOptional<z.ZodNumber>;
		sourceSnapshotId: z.ZodOptional<z.ZodString>;
		snapshottedAt: z.ZodOptional<z.ZodNumber>;
		createdAt: z.ZodNumber;
		cwd: z.ZodString;
		updatedAt: z.ZodNumber;
		interactivePort: z.ZodOptional<z.ZodNumber>;
		networkPolicy: z.ZodOptional<z.ZodUnion<readonly [
			z.ZodUnion<readonly [
				z.ZodObject<{
					mode: z.ZodLiteral<"allow-all">;
				}, z.core.$loose>,
				z.ZodObject<{
					mode: z.ZodLiteral<"deny-all">;
				}, z.core.$loose>
			]>,
			z.ZodObject<{
				mode: z.ZodLiteral<"custom">;
				allowedDomains: z.ZodOptional<z.ZodArray<z.ZodString>>;
				allowedCIDRs: z.ZodOptional<z.ZodArray<z.ZodString>>;
				deniedCIDRs: z.ZodOptional<z.ZodArray<z.ZodString>>;
				injectionRules: z.ZodOptional<z.ZodArray<z.ZodObject<{
					domain: z.ZodString;
					headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
					headerNames: z.ZodOptional<z.ZodArray<z.ZodString>>;
					match: z.ZodOptional<z.ZodObject<{
						path: z.ZodOptional<z.ZodObject<{
							exact: z.ZodOptional<z.ZodString>;
							startsWith: z.ZodOptional<z.ZodString>;
							regex: z.ZodOptional<z.ZodString>;
						}, z.core.$strip>>;
						method: z.ZodOptional<z.ZodArray<z.ZodString>>;
						queryString: z.ZodOptional<z.ZodArray<z.ZodObject<{
							key: z.ZodOptional<z.ZodObject<{
								exact: z.ZodOptional<z.ZodString>;
								startsWith: z.ZodOptional<z.ZodString>;
								regex: z.ZodOptional<z.ZodString>;
							}, z.core.$strip>>;
							value: z.ZodOptional<z.ZodObject<{
								exact: z.ZodOptional<z.ZodString>;
								startsWith: z.ZodOptional<z.ZodString>;
								regex: z.ZodOptional<z.ZodString>;
							}, z.core.$strip>>;
						}, z.core.$strip>>>;
						headers: z.ZodOptional<z.ZodArray<z.ZodObject<{
							key: z.ZodOptional<z.ZodObject<{
								exact: z.ZodOptional<z.ZodString>;
								startsWith: z.ZodOptional<z.ZodString>;
								regex: z.ZodOptional<z.ZodString>;
							}, z.core.$strip>>;
							value: z.ZodOptional<z.ZodObject<{
								exact: z.ZodOptional<z.ZodString>;
								startsWith: z.ZodOptional<z.ZodString>;
								regex: z.ZodOptional<z.ZodString>;
							}, z.core.$strip>>;
						}, z.core.$strip>>>;
					}, z.core.$strip>>;
				}, z.core.$strip>>>;
				forwardRules: z.ZodOptional<z.ZodArray<z.ZodObject<{
					domain: z.ZodString;
					forwardURL: z.ZodString;
					match: z.ZodOptional<z.ZodObject<{
						path: z.ZodOptional<z.ZodObject<{
							exact: z.ZodOptional<z.ZodString>;
							startsWith: z.ZodOptional<z.ZodString>;
							regex: z.ZodOptional<z.ZodString>;
						}, z.core.$strip>>;
						method: z.ZodOptional<z.ZodArray<z.ZodString>>;
						queryString: z.ZodOptional<z.ZodArray<z.ZodObject<{
							key: z.ZodOptional<z.ZodObject<{
								exact: z.ZodOptional<z.ZodString>;
								startsWith: z.ZodOptional<z.ZodString>;
								regex: z.ZodOptional<z.ZodString>;
							}, z.core.$strip>>;
							value: z.ZodOptional<z.ZodObject<{
								exact: z.ZodOptional<z.ZodString>;
								startsWith: z.ZodOptional<z.ZodString>;
								regex: z.ZodOptional<z.ZodString>;
							}, z.core.$strip>>;
						}, z.core.$strip>>>;
						headers: z.ZodOptional<z.ZodArray<z.ZodObject<{
							key: z.ZodOptional<z.ZodObject<{
								exact: z.ZodOptional<z.ZodString>;
								startsWith: z.ZodOptional<z.ZodString>;
								regex: z.ZodOptional<z.ZodString>;
							}, z.core.$strip>>;
							value: z.ZodOptional<z.ZodObject<{
								exact: z.ZodOptional<z.ZodString>;
								startsWith: z.ZodOptional<z.ZodString>;
								regex: z.ZodOptional<z.ZodString>;
							}, z.core.$strip>>;
						}, z.core.$strip>>>;
					}, z.core.$strip>>;
				}, z.core.$strip>>>;
			}, z.core.$loose>
		]>>;
		activeCpuDurationMs: z.ZodOptional<z.ZodNumber>;
		networkTransfer: z.ZodOptional<z.ZodObject<{
			ingress: z.ZodNumber;
			egress: z.ZodNumber;
		}, z.core.$strip>>;
	}, z.core.$loose>;
	sandbox: z.ZodOptional<z.ZodObject<{
		name: z.ZodString;
		persistent: z.ZodBoolean;
		region: z.ZodOptional<z.ZodString>;
		failoverRegions: z.ZodOptional<z.ZodArray<z.ZodString>>;
		vcpus: z.ZodOptional<z.ZodNumber>;
		memory: z.ZodOptional<z.ZodNumber>;
		runtime: z.ZodOptional<z.ZodString>;
		image: z.ZodOptional<z.ZodString>;
		timeout: z.ZodOptional<z.ZodNumber>;
		networkPolicy: z.ZodOptional<z.ZodUnion<readonly [
			z.ZodUnion<readonly [
				z.ZodObject<{
					mode: z.ZodLiteral<"allow-all">;
				}, z.core.$loose>,
				z.ZodObject<{
					mode: z.ZodLiteral<"deny-all">;
				}, z.core.$loose>
			]>,
			z.ZodObject<{
				mode: z.ZodLiteral<"custom">;
				allowedDomains: z.ZodOptional<z.ZodArray<z.ZodString>>;
				allowedCIDRs: z.ZodOptional<z.ZodArray<z.ZodString>>;
				deniedCIDRs: z.ZodOptional<z.ZodArray<z.ZodString>>;
				injectionRules: z.ZodOptional<z.ZodArray<z.ZodObject<{
					domain: z.ZodString;
					headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
					headerNames: z.ZodOptional<z.ZodArray<z.ZodString>>;
					match: z.ZodOptional<z.ZodObject<{
						path: z.ZodOptional<z.ZodObject<{
							exact: z.ZodOptional<z.ZodString>;
							startsWith: z.ZodOptional<z.ZodString>;
							regex: z.ZodOptional<z.ZodString>;
						}, z.core.$strip>>;
						method: z.ZodOptional<z.ZodArray<z.ZodString>>;
						queryString: z.ZodOptional<z.ZodArray<z.ZodObject<{
							key: z.ZodOptional<z.ZodObject<{
								exact: z.ZodOptional<z.ZodString>;
								startsWith: z.ZodOptional<z.ZodString>;
								regex: z.ZodOptional<z.ZodString>;
							}, z.core.$strip>>;
							value: z.ZodOptional<z.ZodObject<{
								exact: z.ZodOptional<z.ZodString>;
								startsWith: z.ZodOptional<z.ZodString>;
								regex: z.ZodOptional<z.ZodString>;
							}, z.core.$strip>>;
						}, z.core.$strip>>>;
						headers: z.ZodOptional<z.ZodArray<z.ZodObject<{
							key: z.ZodOptional<z.ZodObject<{
								exact: z.ZodOptional<z.ZodString>;
								startsWith: z.ZodOptional<z.ZodString>;
								regex: z.ZodOptional<z.ZodString>;
							}, z.core.$strip>>;
							value: z.ZodOptional<z.ZodObject<{
								exact: z.ZodOptional<z.ZodString>;
								startsWith: z.ZodOptional<z.ZodString>;
								regex: z.ZodOptional<z.ZodString>;
							}, z.core.$strip>>;
						}, z.core.$strip>>>;
					}, z.core.$strip>>;
				}, z.core.$strip>>>;
				forwardRules: z.ZodOptional<z.ZodArray<z.ZodObject<{
					domain: z.ZodString;
					forwardURL: z.ZodString;
					match: z.ZodOptional<z.ZodObject<{
						path: z.ZodOptional<z.ZodObject<{
							exact: z.ZodOptional<z.ZodString>;
							startsWith: z.ZodOptional<z.ZodString>;
							regex: z.ZodOptional<z.ZodString>;
						}, z.core.$strip>>;
						method: z.ZodOptional<z.ZodArray<z.ZodString>>;
						queryString: z.ZodOptional<z.ZodArray<z.ZodObject<{
							key: z.ZodOptional<z.ZodObject<{
								exact: z.ZodOptional<z.ZodString>;
								startsWith: z.ZodOptional<z.ZodString>;
								regex: z.ZodOptional<z.ZodString>;
							}, z.core.$strip>>;
							value: z.ZodOptional<z.ZodObject<{
								exact: z.ZodOptional<z.ZodString>;
								startsWith: z.ZodOptional<z.ZodString>;
								regex: z.ZodOptional<z.ZodString>;
							}, z.core.$strip>>;
						}, z.core.$strip>>>;
						headers: z.ZodOptional<z.ZodArray<z.ZodObject<{
							key: z.ZodOptional<z.ZodObject<{
								exact: z.ZodOptional<z.ZodString>;
								startsWith: z.ZodOptional<z.ZodString>;
								regex: z.ZodOptional<z.ZodString>;
							}, z.core.$strip>>;
							value: z.ZodOptional<z.ZodObject<{
								exact: z.ZodOptional<z.ZodString>;
								startsWith: z.ZodOptional<z.ZodString>;
								regex: z.ZodOptional<z.ZodString>;
							}, z.core.$strip>>;
						}, z.core.$strip>>>;
					}, z.core.$strip>>;
				}, z.core.$strip>>>;
			}, z.core.$loose>
		]>>;
		totalEgressBytes: z.ZodOptional<z.ZodNumber>;
		totalIngressBytes: z.ZodOptional<z.ZodNumber>;
		totalActiveCpuDurationMs: z.ZodOptional<z.ZodNumber>;
		totalDurationMs: z.ZodOptional<z.ZodNumber>;
		createdAt: z.ZodNumber;
		updatedAt: z.ZodNumber;
		expiresAt: z.ZodOptional<z.ZodNumber>;
		currentSessionId: z.ZodString;
		currentSnapshotId: z.ZodOptional<z.ZodString>;
		status: z.ZodEnum<{
			pending: "pending";
			running: "running";
			stopping: "stopping";
			stopped: "stopped";
			failed: "failed";
			aborted: "aborted";
			snapshotting: "snapshotting";
		}>;
		statusUpdatedAt: z.ZodOptional<z.ZodNumber>;
		cwd: z.ZodOptional<z.ZodString>;
		tags: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
		mounts: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodPipe<z.ZodObject<{
			drive: z.ZodString;
			mode: z.ZodOptional<z.ZodEnum<{
				snapshot: "snapshot";
				"read-write": "read-write";
				"read-only": "read-only";
			}>>;
		}, z.core.$strip>, z.ZodTransform<{
			drive: string;
			mode: "snapshot" | "read-write";
		}, {
			drive: string;
			mode?: "snapshot" | "read-write" | "read-only" | undefined;
		}>>>>;
		snapshotExpiration: z.ZodOptional<z.ZodNumber>;
		keepLastSnapshots: z.ZodOptional<z.ZodObject<{
			count: z.ZodNumber;
			expiration: z.ZodOptional<z.ZodNumber>;
			deleteEvicted: z.ZodOptional<z.ZodBoolean>;
		}, z.core.$strip>>;
	}, z.core.$strip>>;
	snapshot: z.ZodOptional<z.ZodObject<{
		id: z.ZodString;
		sourceSessionId: z.ZodString;
		region: z.ZodString;
		regions: z.ZodOptional<z.ZodArray<z.ZodString>>;
		status: z.ZodEnum<{
			failed: "failed";
			created: "created";
			deleted: "deleted";
		}>;
		sizeBytes: z.ZodNumber;
		expiresAt: z.ZodOptional<z.ZodNumber>;
		createdAt: z.ZodNumber;
		updatedAt: z.ZodNumber;
		lastUsedAt: z.ZodOptional<z.ZodNumber>;
		creationMethod: z.ZodOptional<z.ZodString>;
		parentId: z.ZodOptional<z.ZodString>;
	}, z.core.$strip>>;
}, z.core.$strip>;
//#region src/network-policy.d.ts
/**
 * A transform applied to network requests matching a domain rule.
 *
 * @example
 * {
 *   headers: { authorization: "Bearer sk-..." }
 * }
 */
export type NetworkTransformer = {
	/** Headers to set on the outgoing request. */
	headers?: Record<string, string>;
};
/**
 * Defines how a request value is matched.
 */
export type NetworkPolicyMatcher = {
	/** Match the value exactly. */
	exact?: string;
} | {
	/** Match values that start with the provided prefix. */
	startsWith?: string;
} | {
	/** Match values against an RE2 regular expression. */
	regex?: string;
};
/**
 * Matcher for key/value request entries such as headers and query parameters.
 */
export type NetworkPolicyKeyValueMatcher = {
	/** Matcher for the entry key. */
	key?: NetworkPolicyMatcher;
	/** Matcher for the entry value. */
	value?: NetworkPolicyMatcher;
};
/**
 * Request matcher for a network policy rule.
 *
 * All specified dimensions must match. Multiple methods are ORed; multiple
 * header and query-string matchers are ANDed.
 */
export type NetworkPolicyMatch = {
	/** Match on the request path. */
	path?: NetworkPolicyMatcher;
	/** Match on the HTTP method. */
	method?: string[];
	/** Match on query-string entries. */
	queryString?: NetworkPolicyKeyValueMatcher[];
	/** Match on request headers. */
	headers?: NetworkPolicyKeyValueMatcher[];
};
/**
 * A rule applied to requests matching a domain in the network policy.
 */
export type NetworkPolicyRule = {
	/**
	 * Optional request matcher. When provided, transforms and forwarding rules
	 * only apply to requests that match every specified dimension.
	 */
	match?: NetworkPolicyMatch;
} & ({
	/**
	 * Transforms to apply to matching requests.
	 *
	 * `transform` cannot be used together with `forwardURL`.
	 */
	transform: NetworkTransformer[];
	forwardURL?: never;
} | {
	transform?: never;
	/**
	 * HTTPS proxy URL to forward matching requests to. Must not include query string or fragment.
	 *
	 * You can use the `defineSandboxProxy` helper from `@vercel/sandbox/proxy` to implement the proxy handler
	 * automatically, which handles authorization and extracts metadata about the request and sandbox.
	 *
	 * `forwardURL` cannot be used together with `transform`.
	 *
	 * @see https://vercel.com/docs/vercel-sandbox/concepts/firewall#requests-proxying
	 */
	forwardURL: string;
});
/**
 * Network policy to define network restrictions for the sandbox.
 *
 * - `"allow-all"`: Full internet access (default). All traffic is allowed.
 * - `"deny-all"`: No internet access. All traffic is denied.
 * - Object: Custom access with explicit allow/deny lists.
 *
 * @example
 * // Full internet access (default)
 * "allow-all"
 *
 * @example
 * // No external access
 * "deny-all"
 *
 * @example
 * // Custom access with specific domains (simple list)
 * // All traffic not explicitly allowed is denied.
 * {
 *   allow: ["*.npmjs.org", "github.com"],
 *   subnets: {
 *     allow: ["10.0.0.0/8"],
 *     deny: ["10.1.0.0/16"]
 *   }
 * }
 *
 * @example
 * // Custom access with specific domains (record form)
 * {
 *   allow: {
 *     "*.npmjs.org": [],
 *     "github.com": [],
 *   }
 * }
 *
 * @example
 * // Custom access with request transformers
 * {
 *   allow: {
 *     "ai-gateway.vercel.sh": [
 *       {
 *         match: {
 *           method: ["POST"],
 *           path: { startsWith: "/v1/" },
 *           headers: [
 *             { key: { exact: "x-api-key" }, value: { exact: "placeholder" } }
 *           ]
 *         },
 *         transform: [{
 *           headers: { authorization: "Bearer ..." }
 *         }]
 *       }
 *     ],
 *     "*": []
 *   }
 * }
 */
export type NetworkPolicy = "allow-all" | "deny-all" | {
	/**
	 * Domains to allow traffic to.
	 * Use "*" prefix for wildcard matching (e.g., "*.npmjs.org").
	 *
	 * Accepts either:
	 * - `string[]`: A simple list of domains to allow.
	 * - `Record<string, NetworkPolicyRule[]>`: A map of domains to rules.
	 *   An empty array allows traffic with no additional rules.
	 */
	allow?: string[] | Record<string, NetworkPolicyRule[]>;
	/**
	 * Subnet-level access control using CIDR notation.
	 */
	subnets?: {
		/**
		 * List of CIDRs to allow traffic to.
		 * Traffic to these addresses will bypass the domain allowlist.
		 */
		allow?: string[];
		/**
		 * List of CIDRs to deny traffic to.
		 * These take precedence over allowed domains and CIDRs.
		 */
		deny?: string[];
	};
};
//#region src/constants.d.ts
export type RUNTIMES = "node26" | "node24" | "node22" | "python3.13";
export type ManagedImage = "universal" | "node:22" | "node:24" | "node:26" | "python:3.14" | "ubuntu" | "arch";
/**
 * Regions a sandbox, snapshot, or drive can live in. More regions may
 * become available, so any other region string is accepted too.
 */
export type SandboxRegion = "iad1" | "sfo1" | "cle1" | "cdg1" | "fra1" | "arn1" | "sin1" | "pdx1" | "lhr1" | "icn1" | "bom1" | "cpt1" | "dub1" | "gru1" | "hkg1" | "syd1" | "yul1" | "hnd1" | "kix1" | (string & {});
//#region src/api-client/with-retry.d.ts
export interface RequestOptions {
	onRetry?(error: any, options: RequestOptions): void;
	retry?: Partial<Options>;
}
//#region src/api-client/base-client.d.ts
export interface RequestParams extends RequestInit {
	headers?: Record<string, string>;
	method?: string;
	onRetry?(error: any, options: RequestOptions): void;
	query?: Record<string, number | string | null | undefined | string[]>;
	retry?: Partial<Options>;
}
declare class BaseClient {
	protected token?: string;
	private fetch;
	private debug;
	private baseUrl;
	private agent;
	constructor(params: {
		debug?: boolean;
		baseUrl: string;
		token?: string;
		fetch?: typeof globalThis.fetch;
	});
	protected request(path: string, opts?: RequestParams): Promise<Response>;
}
export interface Parsed<Data> {
	response: Response;
	text: string;
	json: Data;
}
//#region src/api-client/file-writer.d.ts
export interface FileData {
	/**
	 * The name (path) of the file to write.
	 */
	name: string;
	/**
	 * The content of the file.
	 */
	content: string | Uint8Array;
	/**
	 * The file mode (permissions) to set on the file.
	 * For example, 0o755 for executable files.
	 */
	mode?: number;
}
export interface FileStream {
	/**
	 * The name (path) of the file to write.
	 */
	name: string;
	/**
	 * A Readable stream to consume the content of the file.
	 */
	content: Readable;
	/**
	 * The expected size of the file. This is required to write
	 * the header of the compressed file.
	 */
	size: number;
	/**
	 * The file mode (permissions) to set on the file.
	 * For example, 0o755 for executable files.
	 */
	mode?: number;
}
declare class FileWriter {
	readable: Readable;
	private pack;
	constructor();
	/**
	 * Allows to add a file to the stream. Size is required to write
	 * the tarball header so when content is a stream it must be
	 * provided.
	 *
	 * Returns a Promise resolved once the file is written in the
	 * stream.
	 */
	addFile(file: FileData | FileStream): Promise<void>;
	/**
	 * Allows to finish the stream returning a Promise that will
	 * resolve once the readable is effectively closed or
	 * errored.
	 */
	end(): Promise<void>;
}
//#region src/utils/types.d.ts
/**
 * Utility type that extends a type to accept private parameters.
 *
 * The private parameters can then be extracted out of the object using
 * `getPrivateParams`.
 */
export type WithPrivate<T> = T & {
	[K in `__${string}`]?: unknown;
};
//#region src/api-client/api-client.d.ts
export interface WithFetchOptions {
	fetch?: typeof globalThis.fetch;
}
declare class APIClient extends BaseClient {
	private teamId;
	private projectId;
	private isJwtToken;
	constructor(params: {
		baseUrl?: string;
		teamId: string;
		token: string;
		fetch?: typeof globalThis.fetch;
	});
	private ensureValidToken;
	protected request(path: string, params?: RequestParams): Promise<Response>;
	getSession(params: WithPrivate<{
		sessionId: string;
		signal?: AbortSignal;
	}>): Promise<Parsed<{
		session: {
			[x: string]: unknown;
			id: string;
			memory: number;
			vcpus: number;
			region: string;
			timeout: number;
			status: "pending" | "running" | "stopping" | "stopped" | "failed" | "aborted" | "snapshotting";
			requestedAt: number;
			createdAt: number;
			cwd: string;
			updatedAt: number;
			runtime?: string | undefined;
			startedAt?: number | undefined;
			requestedStopAt?: number | undefined;
			stoppedAt?: number | undefined;
			abortedAt?: number | undefined;
			duration?: number | undefined;
			sourceSnapshotId?: string | undefined;
			snapshottedAt?: number | undefined;
			interactivePort?: number | undefined;
			networkPolicy?: {
				[x: string]: unknown;
				mode: "allow-all";
			} | {
				[x: string]: unknown;
				mode: "deny-all";
			} | {
				[x: string]: unknown;
				mode: "custom";
				allowedDomains?: string[] | undefined;
				allowedCIDRs?: string[] | undefined;
				deniedCIDRs?: string[] | undefined;
				injectionRules?: {
					domain: string;
					headers?: Record<string, string> | undefined;
					headerNames?: string[] | undefined;
					match?: {
						path?: {
							exact?: string | undefined;
							startsWith?: string | undefined;
							regex?: string | undefined;
						} | undefined;
						method?: string[] | undefined;
						queryString?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
						headers?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
					} | undefined;
				}[] | undefined;
				forwardRules?: {
					domain: string;
					forwardURL: string;
					match?: {
						path?: {
							exact?: string | undefined;
							startsWith?: string | undefined;
							regex?: string | undefined;
						} | undefined;
						method?: string[] | undefined;
						queryString?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
						headers?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
					} | undefined;
				}[] | undefined;
			} | undefined;
			activeCpuDurationMs?: number | undefined;
			networkTransfer?: {
				ingress: number;
				egress: number;
			} | undefined;
		};
		routes: {
			url: string;
			subdomain: string;
			port: number;
		}[];
	}>>;
	createSandbox(params: WithPrivate<{
		name?: string;
		ports?: number[];
		projectId: string;
		source?: {
			type: "git";
			url: string;
			depth?: number;
			revision?: string;
			username?: string;
			password?: string;
		} | {
			type: "tarball";
			url: string;
		} | {
			type: "snapshot";
			snapshotId: string;
		};
		timeout?: number;
		resources?: {
			vcpus: number;
		};
		persistent?: boolean;
		runtime?: RUNTIMES | (string & {});
		image?: string;
		networkPolicy?: NetworkPolicy;
		env?: Record<string, string>;
		tags?: Record<string, string>;
		snapshotExpiration?: number;
		keepLastSnapshots?: {
			count: number;
			expiration?: number;
			deleteEvicted?: boolean;
		};
		mounts?: SandboxMetaData["mounts"];
		region?: SandboxRegion;
		failoverRegions?: SandboxRegion[];
		signal?: AbortSignal;
	}>): Promise<Parsed<{
		sandbox: {
			name: string;
			persistent: boolean;
			createdAt: number;
			updatedAt: number;
			currentSessionId: string;
			status: "pending" | "running" | "stopping" | "stopped" | "failed" | "aborted" | "snapshotting";
			region?: string | undefined;
			failoverRegions?: string[] | undefined;
			vcpus?: number | undefined;
			memory?: number | undefined;
			runtime?: string | undefined;
			image?: string | undefined;
			timeout?: number | undefined;
			networkPolicy?: {
				[x: string]: unknown;
				mode: "allow-all";
			} | {
				[x: string]: unknown;
				mode: "deny-all";
			} | {
				[x: string]: unknown;
				mode: "custom";
				allowedDomains?: string[] | undefined;
				allowedCIDRs?: string[] | undefined;
				deniedCIDRs?: string[] | undefined;
				injectionRules?: {
					domain: string;
					headers?: Record<string, string> | undefined;
					headerNames?: string[] | undefined;
					match?: {
						path?: {
							exact?: string | undefined;
							startsWith?: string | undefined;
							regex?: string | undefined;
						} | undefined;
						method?: string[] | undefined;
						queryString?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
						headers?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
					} | undefined;
				}[] | undefined;
				forwardRules?: {
					domain: string;
					forwardURL: string;
					match?: {
						path?: {
							exact?: string | undefined;
							startsWith?: string | undefined;
							regex?: string | undefined;
						} | undefined;
						method?: string[] | undefined;
						queryString?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
						headers?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
					} | undefined;
				}[] | undefined;
			} | undefined;
			totalEgressBytes?: number | undefined;
			totalIngressBytes?: number | undefined;
			totalActiveCpuDurationMs?: number | undefined;
			totalDurationMs?: number | undefined;
			expiresAt?: number | undefined;
			currentSnapshotId?: string | undefined;
			statusUpdatedAt?: number | undefined;
			cwd?: string | undefined;
			tags?: Record<string, string> | undefined;
			mounts?: Record<string, {
				drive: string;
				mode: "snapshot" | "read-write";
			}> | undefined;
			snapshotExpiration?: number | undefined;
			keepLastSnapshots?: {
				count: number;
				expiration?: number | undefined;
				deleteEvicted?: boolean | undefined;
			} | undefined;
		};
		session: {
			[x: string]: unknown;
			id: string;
			memory: number;
			vcpus: number;
			region: string;
			timeout: number;
			status: "pending" | "running" | "stopping" | "stopped" | "failed" | "aborted" | "snapshotting";
			requestedAt: number;
			createdAt: number;
			cwd: string;
			updatedAt: number;
			runtime?: string | undefined;
			startedAt?: number | undefined;
			requestedStopAt?: number | undefined;
			stoppedAt?: number | undefined;
			abortedAt?: number | undefined;
			duration?: number | undefined;
			sourceSnapshotId?: string | undefined;
			snapshottedAt?: number | undefined;
			interactivePort?: number | undefined;
			networkPolicy?: {
				[x: string]: unknown;
				mode: "allow-all";
			} | {
				[x: string]: unknown;
				mode: "deny-all";
			} | {
				[x: string]: unknown;
				mode: "custom";
				allowedDomains?: string[] | undefined;
				allowedCIDRs?: string[] | undefined;
				deniedCIDRs?: string[] | undefined;
				injectionRules?: {
					domain: string;
					headers?: Record<string, string> | undefined;
					headerNames?: string[] | undefined;
					match?: {
						path?: {
							exact?: string | undefined;
							startsWith?: string | undefined;
							regex?: string | undefined;
						} | undefined;
						method?: string[] | undefined;
						queryString?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
						headers?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
					} | undefined;
				}[] | undefined;
				forwardRules?: {
					domain: string;
					forwardURL: string;
					match?: {
						path?: {
							exact?: string | undefined;
							startsWith?: string | undefined;
							regex?: string | undefined;
						} | undefined;
						method?: string[] | undefined;
						queryString?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
						headers?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
					} | undefined;
				}[] | undefined;
			} | undefined;
			activeCpuDurationMs?: number | undefined;
			networkTransfer?: {
				ingress: number;
				egress: number;
			} | undefined;
		};
		routes: {
			url: string;
			subdomain: string;
			port: number;
		}[];
		resumed?: boolean | undefined;
	}>>;
	forkSandbox(params: WithPrivate<{
		sourceSandbox: string;
		projectId: string;
		name?: string;
		ports?: number[];
		timeout?: number;
		resources?: {
			vcpus: number;
		};
		persistent?: boolean;
		image?: string;
		networkPolicy?: NetworkPolicy;
		env?: Record<string, string>;
		tags?: Record<string, string>;
		snapshotExpiration?: number;
		keepLastSnapshots?: {
			count: number;
			expiration?: number;
			deleteEvicted?: boolean;
		};
		region?: SandboxRegion;
		failoverRegions?: SandboxRegion[];
		signal?: AbortSignal;
	}>): Promise<Parsed<{
		sandbox: {
			name: string;
			persistent: boolean;
			createdAt: number;
			updatedAt: number;
			currentSessionId: string;
			status: "pending" | "running" | "stopping" | "stopped" | "failed" | "aborted" | "snapshotting";
			region?: string | undefined;
			failoverRegions?: string[] | undefined;
			vcpus?: number | undefined;
			memory?: number | undefined;
			runtime?: string | undefined;
			image?: string | undefined;
			timeout?: number | undefined;
			networkPolicy?: {
				[x: string]: unknown;
				mode: "allow-all";
			} | {
				[x: string]: unknown;
				mode: "deny-all";
			} | {
				[x: string]: unknown;
				mode: "custom";
				allowedDomains?: string[] | undefined;
				allowedCIDRs?: string[] | undefined;
				deniedCIDRs?: string[] | undefined;
				injectionRules?: {
					domain: string;
					headers?: Record<string, string> | undefined;
					headerNames?: string[] | undefined;
					match?: {
						path?: {
							exact?: string | undefined;
							startsWith?: string | undefined;
							regex?: string | undefined;
						} | undefined;
						method?: string[] | undefined;
						queryString?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
						headers?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
					} | undefined;
				}[] | undefined;
				forwardRules?: {
					domain: string;
					forwardURL: string;
					match?: {
						path?: {
							exact?: string | undefined;
							startsWith?: string | undefined;
							regex?: string | undefined;
						} | undefined;
						method?: string[] | undefined;
						queryString?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
						headers?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
					} | undefined;
				}[] | undefined;
			} | undefined;
			totalEgressBytes?: number | undefined;
			totalIngressBytes?: number | undefined;
			totalActiveCpuDurationMs?: number | undefined;
			totalDurationMs?: number | undefined;
			expiresAt?: number | undefined;
			currentSnapshotId?: string | undefined;
			statusUpdatedAt?: number | undefined;
			cwd?: string | undefined;
			tags?: Record<string, string> | undefined;
			mounts?: Record<string, {
				drive: string;
				mode: "snapshot" | "read-write";
			}> | undefined;
			snapshotExpiration?: number | undefined;
			keepLastSnapshots?: {
				count: number;
				expiration?: number | undefined;
				deleteEvicted?: boolean | undefined;
			} | undefined;
		};
		session: {
			[x: string]: unknown;
			id: string;
			memory: number;
			vcpus: number;
			region: string;
			timeout: number;
			status: "pending" | "running" | "stopping" | "stopped" | "failed" | "aborted" | "snapshotting";
			requestedAt: number;
			createdAt: number;
			cwd: string;
			updatedAt: number;
			runtime?: string | undefined;
			startedAt?: number | undefined;
			requestedStopAt?: number | undefined;
			stoppedAt?: number | undefined;
			abortedAt?: number | undefined;
			duration?: number | undefined;
			sourceSnapshotId?: string | undefined;
			snapshottedAt?: number | undefined;
			interactivePort?: number | undefined;
			networkPolicy?: {
				[x: string]: unknown;
				mode: "allow-all";
			} | {
				[x: string]: unknown;
				mode: "deny-all";
			} | {
				[x: string]: unknown;
				mode: "custom";
				allowedDomains?: string[] | undefined;
				allowedCIDRs?: string[] | undefined;
				deniedCIDRs?: string[] | undefined;
				injectionRules?: {
					domain: string;
					headers?: Record<string, string> | undefined;
					headerNames?: string[] | undefined;
					match?: {
						path?: {
							exact?: string | undefined;
							startsWith?: string | undefined;
							regex?: string | undefined;
						} | undefined;
						method?: string[] | undefined;
						queryString?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
						headers?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
					} | undefined;
				}[] | undefined;
				forwardRules?: {
					domain: string;
					forwardURL: string;
					match?: {
						path?: {
							exact?: string | undefined;
							startsWith?: string | undefined;
							regex?: string | undefined;
						} | undefined;
						method?: string[] | undefined;
						queryString?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
						headers?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
					} | undefined;
				}[] | undefined;
			} | undefined;
			activeCpuDurationMs?: number | undefined;
			networkTransfer?: {
				ingress: number;
				egress: number;
			} | undefined;
		};
		routes: {
			url: string;
			subdomain: string;
			port: number;
		}[];
		resumed?: boolean | undefined;
	}>>;
	runCommand(params: {
		sessionId: string;
		cwd?: string;
		command: string;
		args: string[];
		env: Record<string, string>;
		sudo: boolean;
		wait: true;
		logs?: boolean;
		onLog?: (log: LogOutputLine) => void;
		timeout?: number;
		signal?: AbortSignal;
	}): Promise<{
		command: CommandData;
		finished: Promise<CommandFinishedData>;
	}>;
	runCommand(params: {
		sessionId: string;
		cwd?: string;
		command: string;
		args: string[];
		env: Record<string, string>;
		sudo: boolean;
		wait?: false;
		timeout?: number;
		signal?: AbortSignal;
	}): Promise<Parsed<z.infer<typeof CommandResponse>>>;
	getCommand(params: {
		sessionId: string;
		cmdId: string;
		wait: true;
		signal?: AbortSignal;
	}): Promise<Parsed<z.infer<typeof CommandFinishedResponse>>>;
	getCommand(params: {
		sessionId: string;
		cmdId: string;
		wait?: boolean;
		signal?: AbortSignal;
	}): Promise<Parsed<z.infer<typeof CommandResponse>>>;
	openInteractive(params: {
		sessionId: string;
		signal?: AbortSignal;
	}): Promise<Parsed<z.infer<typeof InteractiveSessionResponse>>>;
	mkDir(params: {
		sessionId: string;
		path: string;
		cwd?: string;
		signal?: AbortSignal;
	}): Promise<Parsed<Record<string, never>>>;
	getFileWriter(params: {
		sessionId: string;
		extractDir: string;
		signal?: AbortSignal;
	}): {
		response: Promise<Response>;
		writer: FileWriter;
	};
	listSessions(params: {
		/**
		 * The ID or name of the project to which the sessions belong.
		 * @example "my-project"
		 */
		projectId: string;
		/**
		 * Filter sessions by sandbox name.
		 */
		name?: string;
		/**
		 * Maximum number of sessions to list from a request.
		 * @example 10
		 */
		limit?: number;
		/**
		 * Cursor for pagination.
		 */
		cursor?: string;
		/**
		 * Sort order for results.
		 */
		sortOrder?: "asc" | "desc";
		signal?: AbortSignal;
	}): Promise<Parsed<{
		sessions: {
			[x: string]: unknown;
			id: string;
			memory: number;
			vcpus: number;
			region: string;
			timeout: number;
			status: "pending" | "running" | "stopping" | "stopped" | "failed" | "aborted" | "snapshotting";
			requestedAt: number;
			createdAt: number;
			cwd: string;
			updatedAt: number;
			runtime?: string | undefined;
			startedAt?: number | undefined;
			requestedStopAt?: number | undefined;
			stoppedAt?: number | undefined;
			abortedAt?: number | undefined;
			duration?: number | undefined;
			sourceSnapshotId?: string | undefined;
			snapshottedAt?: number | undefined;
			interactivePort?: number | undefined;
			networkPolicy?: {
				[x: string]: unknown;
				mode: "allow-all";
			} | {
				[x: string]: unknown;
				mode: "deny-all";
			} | {
				[x: string]: unknown;
				mode: "custom";
				allowedDomains?: string[] | undefined;
				allowedCIDRs?: string[] | undefined;
				deniedCIDRs?: string[] | undefined;
				injectionRules?: {
					domain: string;
					headers?: Record<string, string> | undefined;
					headerNames?: string[] | undefined;
					match?: {
						path?: {
							exact?: string | undefined;
							startsWith?: string | undefined;
							regex?: string | undefined;
						} | undefined;
						method?: string[] | undefined;
						queryString?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
						headers?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
					} | undefined;
				}[] | undefined;
				forwardRules?: {
					domain: string;
					forwardURL: string;
					match?: {
						path?: {
							exact?: string | undefined;
							startsWith?: string | undefined;
							regex?: string | undefined;
						} | undefined;
						method?: string[] | undefined;
						queryString?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
						headers?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
					} | undefined;
				}[] | undefined;
			} | undefined;
			activeCpuDurationMs?: number | undefined;
			networkTransfer?: {
				ingress: number;
				egress: number;
			} | undefined;
		}[];
		pagination: {
			count: number;
			next: string | null;
		};
	}>>;
	listSnapshots(params: {
		/**
		 * The ID or name of the project to which the snapshots belong.
		 * @example "my-project"
		 */
		projectId: string;
		/**
		 * Filter snapshots by sandbox name.
		 */
		name?: string;
		/**
		 * Maximum number of snapshots to list from a request.
		 * @example 10
		 */
		limit?: number;
		/**
		 * Cursor for pagination.
		 */
		cursor?: string;
		/**
		 * Sort order for results.
		 */
		sortOrder?: "asc" | "desc";
		signal?: AbortSignal;
	}): Promise<Parsed<{
		snapshots: {
			id: string;
			sourceSessionId: string;
			region: string;
			status: "failed" | "created" | "deleted";
			sizeBytes: number;
			createdAt: number;
			updatedAt: number;
			regions?: string[] | undefined;
			expiresAt?: number | undefined;
			lastUsedAt?: number | undefined;
			creationMethod?: string | undefined;
			parentId?: string | undefined;
		}[];
		pagination: {
			count: number;
			next: string | null;
		};
	}>>;
	getSnapshotTree(params: {
		/**
		 * The ID or name of the project to which the snapshots belong.
		 */
		projectId: string;
		/**
		 * The snapshot ID to use as the anchor for the tree traversal.
		 */
		snapshotId: string;
		/**
		 * Maximum number of nodes to return.
		 */
		limit?: number;
		/**
		 * Sort order: "asc" for descendants, "desc" for ancestors.
		 */
		sortOrder?: "asc" | "desc";
		signal?: AbortSignal;
	}): Promise<Parsed<{
		snapshots: {
			snapshot: {
				id: string;
				sourceSessionId: string;
				region: string;
				status: "failed" | "created" | "deleted";
				sizeBytes: number;
				createdAt: number;
				updatedAt: number;
				regions?: string[] | undefined;
				expiresAt?: number | undefined;
				lastUsedAt?: number | undefined;
				creationMethod?: string | undefined;
				parentId?: string | undefined;
			};
			siblings: {
				id: string;
				sourceSessionId: string;
				region: string;
				status: "failed" | "created" | "deleted";
				sizeBytes: number;
				createdAt: number;
				updatedAt: number;
				regions?: string[] | undefined;
				expiresAt?: number | undefined;
				lastUsedAt?: number | undefined;
				creationMethod?: string | undefined;
				parentId?: string | undefined;
			}[];
			count: string;
		}[];
		pagination: {
			count: number;
			next: string | null;
		};
		anchor?: {
			snapshot: {
				id: string;
				sourceSessionId: string;
				region: string;
				status: "failed" | "created" | "deleted";
				sizeBytes: number;
				createdAt: number;
				updatedAt: number;
				regions?: string[] | undefined;
				expiresAt?: number | undefined;
				lastUsedAt?: number | undefined;
				creationMethod?: string | undefined;
				parentId?: string | undefined;
			};
			siblings: {
				id: string;
				sourceSessionId: string;
				region: string;
				status: "failed" | "created" | "deleted";
				sizeBytes: number;
				createdAt: number;
				updatedAt: number;
				regions?: string[] | undefined;
				expiresAt?: number | undefined;
				lastUsedAt?: number | undefined;
				creationMethod?: string | undefined;
				parentId?: string | undefined;
			}[];
			count: string;
		} | undefined;
	}>>;
	listDrives(params: {
		projectId: string;
		limit?: number;
		cursor?: string;
		sortBy?: "createdAt" | "updatedAt" | "name";
		sortOrder?: "asc" | "desc";
		namePrefix?: string;
		signal?: AbortSignal;
	}): Promise<Parsed<{
		drives: {
			id: string;
			name: string;
			projectId: string;
			region: string;
			maxSizeBytes: number;
			createdAt: number;
			updatedAt: number;
			currentSessionId?: string | undefined;
			currentSandboxName?: string | undefined;
		}[];
		pagination: {
			count: number;
			next: string | null;
		};
	}>>;
	getOrCreateDrive(params: {
		projectId: string;
		name: string;
		region?: string;
		maxSizeBytes?: number;
		signal?: AbortSignal;
	}): Promise<Parsed<{
		drive: {
			id: string;
			name: string;
			projectId: string;
			region: string;
			maxSizeBytes: number;
			createdAt: number;
			updatedAt: number;
			currentSessionId?: string | undefined;
			currentSandboxName?: string | undefined;
		};
	}>>;
	writeFiles(params: {
		sessionId: string;
		cwd: string;
		files: {
			path: string;
			content: string | Uint8Array;
			mode?: number;
		}[];
		extractDir: string;
		signal?: AbortSignal;
	}): Promise<void>;
	readFile(params: {
		sessionId: string;
		path: string;
		cwd?: string;
		signal?: AbortSignal;
	}): Promise<Readable | null>;
	killCommand(params: {
		sessionId: string;
		commandId: string;
		signal: number;
		abortSignal?: AbortSignal;
	}): Promise<Parsed<{
		command: {
			id: string;
			name: string;
			args: string[];
			cwd: string;
			sessionId: string;
			exitCode: number | null;
			startedAt: number;
			durationMs?: number | undefined;
		};
	}>>;
	getLogs(params: {
		sessionId: string;
		cmdId: string;
		signal?: AbortSignal;
	}): AsyncGenerator<LogOutputLine, void, void> & Disposable & {
		close(): void;
	};
	stopSession(params: {
		sessionId: string;
		signal?: AbortSignal;
	}): Promise<Parsed<z.infer<typeof StopSessionResponse>>>;
	updateNetworkPolicy(params: {
		sessionId: string;
		networkPolicy: NetworkPolicy;
		signal?: AbortSignal;
	}): Promise<Parsed<z.infer<typeof SessionResponse>>>;
	extendTimeout(params: {
		sessionId: string;
		duration: number;
		signal?: AbortSignal;
	}): Promise<Parsed<z.infer<typeof SessionResponse>>>;
	createSnapshot(params: {
		sessionId: string;
		expiration?: number;
		signal?: AbortSignal;
	}): Promise<Parsed<z.infer<typeof CreateSnapshotResponse>>>;
	deleteSnapshot(params: {
		snapshotId: string;
		signal?: AbortSignal;
	}): Promise<Parsed<z.infer<typeof SnapshotResponse>>>;
	getSnapshot(params: {
		snapshotId: string;
		signal?: AbortSignal;
	}): Promise<Parsed<z.infer<typeof SnapshotResponse>>>;
	getSandbox(params: WithPrivate<{
		name: string;
		projectId: string;
		resume?: boolean;
		signal?: AbortSignal;
	}>): Promise<Parsed<{
		sandbox: {
			name: string;
			persistent: boolean;
			createdAt: number;
			updatedAt: number;
			currentSessionId: string;
			status: "pending" | "running" | "stopping" | "stopped" | "failed" | "aborted" | "snapshotting";
			region?: string | undefined;
			failoverRegions?: string[] | undefined;
			vcpus?: number | undefined;
			memory?: number | undefined;
			runtime?: string | undefined;
			image?: string | undefined;
			timeout?: number | undefined;
			networkPolicy?: {
				[x: string]: unknown;
				mode: "allow-all";
			} | {
				[x: string]: unknown;
				mode: "deny-all";
			} | {
				[x: string]: unknown;
				mode: "custom";
				allowedDomains?: string[] | undefined;
				allowedCIDRs?: string[] | undefined;
				deniedCIDRs?: string[] | undefined;
				injectionRules?: {
					domain: string;
					headers?: Record<string, string> | undefined;
					headerNames?: string[] | undefined;
					match?: {
						path?: {
							exact?: string | undefined;
							startsWith?: string | undefined;
							regex?: string | undefined;
						} | undefined;
						method?: string[] | undefined;
						queryString?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
						headers?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
					} | undefined;
				}[] | undefined;
				forwardRules?: {
					domain: string;
					forwardURL: string;
					match?: {
						path?: {
							exact?: string | undefined;
							startsWith?: string | undefined;
							regex?: string | undefined;
						} | undefined;
						method?: string[] | undefined;
						queryString?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
						headers?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
					} | undefined;
				}[] | undefined;
			} | undefined;
			totalEgressBytes?: number | undefined;
			totalIngressBytes?: number | undefined;
			totalActiveCpuDurationMs?: number | undefined;
			totalDurationMs?: number | undefined;
			expiresAt?: number | undefined;
			currentSnapshotId?: string | undefined;
			statusUpdatedAt?: number | undefined;
			cwd?: string | undefined;
			tags?: Record<string, string> | undefined;
			mounts?: Record<string, {
				drive: string;
				mode: "snapshot" | "read-write";
			}> | undefined;
			snapshotExpiration?: number | undefined;
			keepLastSnapshots?: {
				count: number;
				expiration?: number | undefined;
				deleteEvicted?: boolean | undefined;
			} | undefined;
		};
		session: {
			[x: string]: unknown;
			id: string;
			memory: number;
			vcpus: number;
			region: string;
			timeout: number;
			status: "pending" | "running" | "stopping" | "stopped" | "failed" | "aborted" | "snapshotting";
			requestedAt: number;
			createdAt: number;
			cwd: string;
			updatedAt: number;
			runtime?: string | undefined;
			startedAt?: number | undefined;
			requestedStopAt?: number | undefined;
			stoppedAt?: number | undefined;
			abortedAt?: number | undefined;
			duration?: number | undefined;
			sourceSnapshotId?: string | undefined;
			snapshottedAt?: number | undefined;
			interactivePort?: number | undefined;
			networkPolicy?: {
				[x: string]: unknown;
				mode: "allow-all";
			} | {
				[x: string]: unknown;
				mode: "deny-all";
			} | {
				[x: string]: unknown;
				mode: "custom";
				allowedDomains?: string[] | undefined;
				allowedCIDRs?: string[] | undefined;
				deniedCIDRs?: string[] | undefined;
				injectionRules?: {
					domain: string;
					headers?: Record<string, string> | undefined;
					headerNames?: string[] | undefined;
					match?: {
						path?: {
							exact?: string | undefined;
							startsWith?: string | undefined;
							regex?: string | undefined;
						} | undefined;
						method?: string[] | undefined;
						queryString?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
						headers?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
					} | undefined;
				}[] | undefined;
				forwardRules?: {
					domain: string;
					forwardURL: string;
					match?: {
						path?: {
							exact?: string | undefined;
							startsWith?: string | undefined;
							regex?: string | undefined;
						} | undefined;
						method?: string[] | undefined;
						queryString?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
						headers?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
					} | undefined;
				}[] | undefined;
			} | undefined;
			activeCpuDurationMs?: number | undefined;
			networkTransfer?: {
				ingress: number;
				egress: number;
			} | undefined;
		};
		routes: {
			url: string;
			subdomain: string;
			port: number;
		}[];
		resumed?: boolean | undefined;
	}>>;
	listSandboxes<Tags extends Record<string, string>>(params: {
		projectId: string;
		limit?: number;
		sortBy?: "createdAt" | "name" | "statusUpdatedAt";
		sortOrder?: "asc" | "desc";
		namePrefix?: string;
		cursor?: string;
		/**
		 * Filter sandboxes by tag. Only a single `{ key: value }` tag filter is
		 * currently supported.
		 * @example { env: "staging" }
		 */
		tags?: Tags & SingleTagFilter<Tags>;
		signal?: AbortSignal;
	}): Promise<Parsed<{
		sandboxes: {
			name: string;
			persistent: boolean;
			createdAt: number;
			updatedAt: number;
			currentSessionId: string;
			status: "pending" | "running" | "stopping" | "stopped" | "failed" | "aborted" | "snapshotting";
			region?: string | undefined;
			failoverRegions?: string[] | undefined;
			vcpus?: number | undefined;
			memory?: number | undefined;
			runtime?: string | undefined;
			image?: string | undefined;
			timeout?: number | undefined;
			networkPolicy?: {
				[x: string]: unknown;
				mode: "allow-all";
			} | {
				[x: string]: unknown;
				mode: "deny-all";
			} | {
				[x: string]: unknown;
				mode: "custom";
				allowedDomains?: string[] | undefined;
				allowedCIDRs?: string[] | undefined;
				deniedCIDRs?: string[] | undefined;
				injectionRules?: {
					domain: string;
					headers?: Record<string, string> | undefined;
					headerNames?: string[] | undefined;
					match?: {
						path?: {
							exact?: string | undefined;
							startsWith?: string | undefined;
							regex?: string | undefined;
						} | undefined;
						method?: string[] | undefined;
						queryString?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
						headers?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
					} | undefined;
				}[] | undefined;
				forwardRules?: {
					domain: string;
					forwardURL: string;
					match?: {
						path?: {
							exact?: string | undefined;
							startsWith?: string | undefined;
							regex?: string | undefined;
						} | undefined;
						method?: string[] | undefined;
						queryString?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
						headers?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
					} | undefined;
				}[] | undefined;
			} | undefined;
			totalEgressBytes?: number | undefined;
			totalIngressBytes?: number | undefined;
			totalActiveCpuDurationMs?: number | undefined;
			totalDurationMs?: number | undefined;
			expiresAt?: number | undefined;
			currentSnapshotId?: string | undefined;
			statusUpdatedAt?: number | undefined;
			cwd?: string | undefined;
			tags?: Record<string, string> | undefined;
			mounts?: Record<string, {
				drive: string;
				mode: "snapshot" | "read-write";
			}> | undefined;
			snapshotExpiration?: number | undefined;
			keepLastSnapshots?: {
				count: number;
				expiration?: number | undefined;
				deleteEvicted?: boolean | undefined;
			} | undefined;
		}[];
		pagination: {
			count: number;
			next: string | null;
		};
	}>>;
	deleteDrive(params: {
		projectId: string;
		name: string;
		signal?: AbortSignal;
	}): Promise<Parsed<{
		drive: {
			id: string;
			name: string;
			projectId: string;
			region: string;
			maxSizeBytes: number;
			createdAt: number;
			updatedAt: number;
			currentSessionId?: string | undefined;
			currentSandboxName?: string | undefined;
		};
	}>>;
	updateSandbox(params: {
		name: string;
		projectId: string;
		persistent?: boolean;
		resources?: {
			vcpus?: number;
			memory?: number;
		};
		timeout?: number;
		networkPolicy?: NetworkPolicy;
		tags?: Record<string, string>;
		ports?: number[];
		snapshotExpiration?: number;
		keepLastSnapshots?: {
			count: number;
			expiration?: number;
			deleteEvicted?: boolean;
		} | null;
		currentSnapshotId?: string;
		region?: SandboxRegion;
		failoverRegions?: SandboxRegion[];
		mounts?: SandboxMetaData["mounts"];
		signal?: AbortSignal;
	}): Promise<Parsed<{
		sandbox: {
			name: string;
			persistent: boolean;
			createdAt: number;
			updatedAt: number;
			currentSessionId: string;
			status: "pending" | "running" | "stopping" | "stopped" | "failed" | "aborted" | "snapshotting";
			region?: string | undefined;
			failoverRegions?: string[] | undefined;
			vcpus?: number | undefined;
			memory?: number | undefined;
			runtime?: string | undefined;
			image?: string | undefined;
			timeout?: number | undefined;
			networkPolicy?: {
				[x: string]: unknown;
				mode: "allow-all";
			} | {
				[x: string]: unknown;
				mode: "deny-all";
			} | {
				[x: string]: unknown;
				mode: "custom";
				allowedDomains?: string[] | undefined;
				allowedCIDRs?: string[] | undefined;
				deniedCIDRs?: string[] | undefined;
				injectionRules?: {
					domain: string;
					headers?: Record<string, string> | undefined;
					headerNames?: string[] | undefined;
					match?: {
						path?: {
							exact?: string | undefined;
							startsWith?: string | undefined;
							regex?: string | undefined;
						} | undefined;
						method?: string[] | undefined;
						queryString?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
						headers?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
					} | undefined;
				}[] | undefined;
				forwardRules?: {
					domain: string;
					forwardURL: string;
					match?: {
						path?: {
							exact?: string | undefined;
							startsWith?: string | undefined;
							regex?: string | undefined;
						} | undefined;
						method?: string[] | undefined;
						queryString?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
						headers?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
					} | undefined;
				}[] | undefined;
			} | undefined;
			totalEgressBytes?: number | undefined;
			totalIngressBytes?: number | undefined;
			totalActiveCpuDurationMs?: number | undefined;
			totalDurationMs?: number | undefined;
			expiresAt?: number | undefined;
			currentSnapshotId?: string | undefined;
			statusUpdatedAt?: number | undefined;
			cwd?: string | undefined;
			tags?: Record<string, string> | undefined;
			mounts?: Record<string, {
				drive: string;
				mode: "snapshot" | "read-write";
			}> | undefined;
			snapshotExpiration?: number | undefined;
			keepLastSnapshots?: {
				count: number;
				expiration?: number | undefined;
				deleteEvicted?: boolean | undefined;
			} | undefined;
		};
		routes?: {
			url: string;
			subdomain: string;
			port: number;
		}[] | undefined;
	}>>;
	deleteSandbox(params: {
		name: string;
		projectId: string;
		deleteOrphanSnapshots?: boolean;
		signal?: AbortSignal;
	}): Promise<Parsed<{
		sandbox: {
			name: string;
			persistent: boolean;
			createdAt: number;
			updatedAt: number;
			currentSessionId: string;
			status: "pending" | "running" | "stopping" | "stopped" | "failed" | "aborted" | "snapshotting";
			region?: string | undefined;
			failoverRegions?: string[] | undefined;
			vcpus?: number | undefined;
			memory?: number | undefined;
			runtime?: string | undefined;
			image?: string | undefined;
			timeout?: number | undefined;
			networkPolicy?: {
				[x: string]: unknown;
				mode: "allow-all";
			} | {
				[x: string]: unknown;
				mode: "deny-all";
			} | {
				[x: string]: unknown;
				mode: "custom";
				allowedDomains?: string[] | undefined;
				allowedCIDRs?: string[] | undefined;
				deniedCIDRs?: string[] | undefined;
				injectionRules?: {
					domain: string;
					headers?: Record<string, string> | undefined;
					headerNames?: string[] | undefined;
					match?: {
						path?: {
							exact?: string | undefined;
							startsWith?: string | undefined;
							regex?: string | undefined;
						} | undefined;
						method?: string[] | undefined;
						queryString?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
						headers?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
					} | undefined;
				}[] | undefined;
				forwardRules?: {
					domain: string;
					forwardURL: string;
					match?: {
						path?: {
							exact?: string | undefined;
							startsWith?: string | undefined;
							regex?: string | undefined;
						} | undefined;
						method?: string[] | undefined;
						queryString?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
						headers?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
					} | undefined;
				}[] | undefined;
			} | undefined;
			totalEgressBytes?: number | undefined;
			totalIngressBytes?: number | undefined;
			totalActiveCpuDurationMs?: number | undefined;
			totalDurationMs?: number | undefined;
			expiresAt?: number | undefined;
			currentSnapshotId?: string | undefined;
			statusUpdatedAt?: number | undefined;
			cwd?: string | undefined;
			tags?: Record<string, string> | undefined;
			mounts?: Record<string, {
				drive: string;
				mode: "snapshot" | "read-write";
			}> | undefined;
			snapshotExpiration?: number | undefined;
			keepLastSnapshots?: {
				count: number;
				expiration?: number | undefined;
				deleteEvicted?: boolean | undefined;
			} | undefined;
		};
		routes?: {
			url: string;
			subdomain: string;
			port: number;
		}[] | undefined;
	}>>;
}
export type UnionToIntersection<Union> = (Union extends unknown ? (arg: Union) => void : never) extends ((arg: infer Intersection) => void) ? Intersection : never;
export type SingleTagFilter<Tags> = [
	keyof Tags
] extends [
	UnionToIntersection<keyof Tags>
] ? Tags : "Error: filtering by multiple tags is not supported. Pass a single `{ key: value }` tag.";
declare const linuxSignalMapping: {
	readonly SIGHUP: 1;
	readonly SIGINT: 2;
	readonly SIGQUIT: 3;
	readonly SIGKILL: 9;
	readonly SIGTERM: 15;
	readonly SIGCONT: 18;
	readonly SIGSTOP: 19;
};
export type CommonLinuxSignals = keyof typeof linuxSignalMapping;
export type Signal = CommonLinuxSignals | number;
declare const WORKFLOW_SERIALIZE: unique symbol;
declare const WORKFLOW_DESERIALIZE: unique symbol;
//#region src/command.d.ts
/**
 * Cached output from a command execution.
 */
export interface CommandOutput {
	stdout: string;
	stderr: string;
}
/**
 * Serialized representation of a Command for @workflow/serde.
 */
export interface SerializedCommand {
	sandboxId: string;
	cmd: CommandData;
	/** Cached output, included if output was fetched before serialization */
	output?: CommandOutput;
}
/**
 * Serialized representation of a CommandFinished for @workflow/serde.
 */
export interface SerializedCommandFinished extends SerializedCommand {
	exitCode: number;
	durationMs?: number;
}
declare class Command$1 {
	/**
	 * Cached API client instance.
	 * @internal
	 */
	protected _client: APIClient | null;
	/**
	 * Lazily resolve credentials and construct an API client.
	 * @internal
	 */
	protected ensureClient(): Promise<APIClient>;
	/**
	 * ID of the session this command is running in.
	 */
	protected sessionId: string;
	/**
	 * Data for the command execution.
	 */
	protected cmd: CommandData;
	exitCode: number | null;
	durationMs?: number;
	protected outputCache: Promise<{
		stdout: string;
		stderr: string;
		both: string;
	}> | null;
	/**
	 * Synchronously accessible resolved output, populated after output is fetched.
	 * Used for serialization.
	 * @internal
	 */
	protected _resolvedOutput: CommandOutput | null;
	/**
	 * ID of the command execution.
	 */
	get cmdId(): string;
	get cwd(): string;
	get startedAt(): number;
	/**
	 * @param params - Object containing the client, sandbox ID, and command data.
	 * @param params.client - Optional API client. If not provided, will be lazily created using global credentials.
	 * @param params.sessionId - The ID of the session where the command is running.
	 * @param params.cmd - The command data.
	 * @param params.output - Optional cached output to restore (used during deserialization).
	 */
	constructor({ client, sessionId, cmd, output }: {
		client?: APIClient;
		sessionId: string;
		cmd: CommandData;
		output?: CommandOutput;
	});
	/**
	 * Serialize a Command instance to plain data for @workflow/serde.
	 *
	 * @param instance - The Command instance to serialize
	 * @returns A plain object containing the sandbox ID, command data, and output if fetched
	 */
	static [WORKFLOW_SERIALIZE](instance: Command$1): SerializedCommand;
	/**
	 * Deserialize plain data back into a Command instance for @workflow/serde.
	 *
	 * The deserialized instance will lazily create an API client using
	 * OIDC or environment credentials when needed.
	 *
	 * @param data - The serialized command data
	 * @returns The reconstructed Command instance
	 */
	static [WORKFLOW_DESERIALIZE](data: SerializedCommand): Command$1;
	/**
	 * Iterate over the output of this command.
	 *
	 * ```
	 * for await (const log of cmd.logs()) {
	 *   if (log.stream === "stdout") {
	 *     process.stdout.write(log.data);
	 *   } else {
	 *     process.stderr.write(log.data);
	 *   }
	 * }
	 * ```
	 *
	 * @param opts - Optional parameters.
	 * @param opts.signal - An AbortSignal to cancel log streaming.
	 * @returns An async iterable of log entries from the command output.
	 *
	 * @see {@link Command.stdout}, {@link Command.stderr}, and {@link Command.output}
	 * to access output as a string.
	 */
	logs(opts?: {
		signal?: AbortSignal;
	}): AsyncGenerator<LogOutputLine, void, void> & Disposable & {
		close(): void;
	};
	/**
	 * Wait for a command to exit and populate its exit code.
	 *
	 * This method is useful for detached commands where you need to wait
	 * for completion. For non-detached commands, {@link Sandbox.runCommand}
	 * automatically waits and returns a {@link CommandFinished} instance.
	 *
	 * ```
	 * const detachedCmd = await sandbox.runCommand({ cmd: 'sleep', args: ['5'], detached: true });
	 * const result = await detachedCmd.wait();
	 * if (result.exitCode !== 0) {
	 *   console.error("Something went wrong...")
	 * }
	 * ```
	 *
	 * @param params - Optional parameters.
	 * @param params.signal - An AbortSignal to cancel waiting.
	 * @returns A {@link CommandFinished} instance with populated exit code.
	 */
	wait(params?: {
		signal?: AbortSignal;
	}): Promise<CommandFinished>;
	/**
	 * Get cached output, fetching logs only once and reusing for concurrent calls.
	 * This prevents race conditions when stdout() and stderr() are called in parallel.
	 */
	protected getCachedOutput(opts?: {
		signal?: AbortSignal;
	}): Promise<{
		stdout: string;
		stderr: string;
		both: string;
	}>;
	/**
	 * Get the output of `stdout`, `stderr`, or both as a string.
	 *
	 * NOTE: This may throw string conversion errors if the command does
	 * not output valid Unicode.
	 *
	 * @param stream - The output stream to read: "stdout", "stderr", or "both".
	 * @param opts - Optional parameters.
	 * @param opts.signal - An AbortSignal to cancel output streaming.
	 * @returns The output of the specified stream(s) as a string.
	 */
	output(stream?: "stdout" | "stderr" | "both", opts?: {
		signal?: AbortSignal;
	}): Promise<string>;
	/**
	 * Get the output of `stdout` as a string.
	 *
	 * NOTE: This may throw string conversion errors if the command does
	 * not output valid Unicode.
	 *
	 * @param opts - Optional parameters.
	 * @param opts.signal - An AbortSignal to cancel output streaming.
	 * @returns The standard output of the command.
	 */
	stdout(opts?: {
		signal?: AbortSignal;
	}): Promise<string>;
	/**
	 * Get the output of `stderr` as a string.
	 *
	 * NOTE: This may throw string conversion errors if the command does
	 * not output valid Unicode.
	 *
	 * @param opts - Optional parameters.
	 * @param opts.signal - An AbortSignal to cancel output streaming.
	 * @returns The standard error output of the command.
	 */
	stderr(opts?: {
		signal?: AbortSignal;
	}): Promise<string>;
	/**
	 * Kill a running command in a sandbox.
	 *
	 * @param signal - The signal to send the running process. Defaults to SIGTERM.
	 * @param opts - Optional parameters.
	 * @param opts.abortSignal - An AbortSignal to cancel the kill operation.
	 * @returns Promise<void>.
	 */
	kill(signal?: Signal, opts?: {
		abortSignal?: AbortSignal;
	}): Promise<void>;
}
declare class CommandFinished extends Command$1 {
	/**
	 * The exit code of the command. This is always populated for
	 * CommandFinished instances.
	 */
	exitCode: number;
	/**
	 * The duration of the command execution in milliseconds.
	 */
	durationMs?: number;
	/**
	 * @param params - Object containing client, sandbox ID, command data, and exit code.
	 * @param params.client - Optional API client. If not provided, will be lazily created using global credentials.
	 * @param params.sessionId - The ID of the session where the command ran.
	 * @param params.cmd - The command data.
	 * @param params.exitCode - The exit code of the completed command.
	 * @param params.durationMs - Optional duration of the command execution in milliseconds.
	 * @param params.output - Optional cached output to restore (used during deserialization).
	 */
	constructor(params: {
		client?: APIClient;
		sessionId: string;
		cmd: CommandData;
		exitCode: number;
		durationMs?: number;
		output?: CommandOutput;
	});
	/**
	 * Serialize a CommandFinished instance to plain data for @workflow/serde.
	 *
	 * @param instance - The CommandFinished instance to serialize
	 * @returns A plain object containing the sandbox ID, command data, exit code, and output if fetched
	 */
	static [WORKFLOW_SERIALIZE](instance: CommandFinished): SerializedCommandFinished;
	/**
	 * Deserialize plain data back into a CommandFinished instance for @workflow/serde.
	 *
	 * The deserialized instance will lazily create an API client using
	 * OIDC or environment credentials when needed.
	 *
	 * @param data - The serialized command finished data
	 * @returns The reconstructed CommandFinished instance
	 */
	static [WORKFLOW_DESERIALIZE](data: SerializedCommandFinished): CommandFinished;
	/**
	 * The wait method is not needed for CommandFinished instances since
	 * the command has already completed and exitCode is populated.
	 *
	 * @deprecated This method is redundant for CommandFinished instances.
	 * The exitCode is already available.
	 * @returns This CommandFinished instance.
	 */
	wait(): Promise<CommandFinished>;
}
//#region src/utils/paginator.d.ts
export type CursorPaginationMeta = {
	count: number;
	next: string | null;
};
export type HasPagination = {
	pagination: CursorPaginationMeta;
};
export type ItemOf<Page, Key extends keyof Page> = Page[Key] extends Array<infer Item> ? Item : never;
export type Paginator<Page extends HasPagination, Key extends keyof Page> = Page & AsyncIterable<ItemOf<Page, Key>> & {
	pages(): AsyncIterable<Page>;
	toArray(): Promise<ItemOf<Page, Key>[]>;
};
//#region src/utils/get-credentials.d.ts
export interface Credentials {
	/**
	 * Authentication token for the Vercel API. It could be an OIDC token
	 * or a personal access token.
	 */
	token: string;
	/**
	 * The ID of the project to associate Sandbox operations.
	 */
	projectId: string;
	/**
	 * The ID of the team to associate Sandbox operations.
	 */
	teamId: string;
}
//#region src/snapshot.d.ts
export interface SerializedSnapshot {
	snapshot: SnapshotMetadata;
}
/** @inline */
export interface GetSnapshotParams {
	/**
	 * Unique identifier of the snapshot.
	 */
	snapshotId: string;
	/**
	 * An AbortSignal to cancel the operation.
	 */
	signal?: AbortSignal;
}
/**
 * A Snapshot is a saved state of a Sandbox that can be used to create new Sandboxes
 *
 * Use {@link Sandbox.snapshot} or {@link Snapshot.get} to construct.
 * @hideconstructor
 */
declare class Snapshot$1 {
	private _client;
	/**
	 * Lazily resolve credentials and construct an API client.
	 * This is used in step contexts where the Snapshot was deserialized
	 * without a client (e.g. when crossing workflow/step boundaries).
	 * @internal
	 */
	private ensureClient;
	/**
	 * Unique ID of this snapshot.
	 */
	get snapshotId(): string;
	/**
	 * The ID of the session from which this snapshot was created.
	 */
	get sourceSessionId(): string;
	/**
	 * All regions where this snapshot is available.
	 */
	get regions(): string[];
	/**
	 * The status of the snapshot.
	 */
	get status(): SnapshotMetadata["status"];
	/**
	 * The size of the snapshot in bytes, or null if not available.
	 */
	get sizeBytes(): number;
	/**
	 * The creation date of this snapshot.
	 */
	get createdAt(): Date;
	/**
	 * When this snapshot was last updated.
	 */
	get updatedAt(): Date;
	/**
	 * The expiration date of this snapshot, or undefined if it does not expire.
	 */
	get expiresAt(): Date | undefined;
	/**
	 * Internal metadata about this snapshot.
	 */
	private snapshot;
	/**
	 * Serialize a Snapshot instance to plain data for @workflow/serde.
	 *
	 * @param instance - The Snapshot instance to serialize
	 * @returns A plain object containing snapshot metadata
	 */
	static [WORKFLOW_SERIALIZE](instance: Snapshot$1): SerializedSnapshot;
	/**
	 * Deserialize a Snapshot from serialized data.
	 *
	 * The deserialized instance uses the serialized metadata synchronously and
	 * lazily creates an API client only when methods perform API requests.
	 *
	 * @param data - The serialized snapshot data
	 * @returns The reconstructed Snapshot instance
	 */
	static [WORKFLOW_DESERIALIZE](data: SerializedSnapshot): Snapshot$1;
	constructor({ client, snapshot }: {
		client?: APIClient;
		snapshot: SnapshotMetadata;
	});
	/**
	 * Allow to get a list of snapshots for a team narrowed to the given params.
	 * It returns both the snapshots and the pagination metadata to allow getting
	 * the next page of results.
	 *
	 * The returned object is async-iterable to auto-paginate through all pages:
	 *
	 * ```ts
	 * const result = await Snapshot.list({ name: "my-sandbox" });
	 * for await (const snapshot of result) { ... }
	 * // or: await result.toArray();
	 * // or: for await (const page of result.pages()) { ... }
	 * ```
	 */
	static list(params?: Partial<Parameters<APIClient["listSnapshots"]>[0]> & Partial<Credentials> & WithFetchOptions): Promise<Paginator<{
		snapshots: {
			id: string;
			sourceSessionId: string;
			region: string;
			status: "failed" | "created" | "deleted";
			sizeBytes: number;
			createdAt: number;
			updatedAt: number;
			regions?: string[] | undefined;
			expiresAt?: number | undefined;
			lastUsedAt?: number | undefined;
			creationMethod?: string | undefined;
			parentId?: string | undefined;
		}[];
		pagination: {
			count: number;
			next: string | null;
		};
	}, "snapshots">>;
	/**
	 * Fetch the snapshot ancestry tree anchored on a given snapshot.
	 * It returns both the tree nodes and the pagination metadata to allow
	 * walking the next page of results in the same direction.
	 *
	 * The returned object is async-iterable to auto-paginate through all pages
	 * in the direction set by `sortOrder` (`"desc"` walks ancestors, `"asc"`
	 * walks descendants):
	 *
	 * ```ts
	 * const result = await Snapshot.tree({ snapshotId: "snap_abc", sortOrder: "desc" });
	 * for await (const node of result) { ... }
	 * // or: await result.toArray();
	 * // or: for await (const page of result.pages()) { ... }
	 * ```
	 */
	static tree(params: {
		snapshotId: string;
	} & Partial<Parameters<APIClient["getSnapshotTree"]>[0]> & Partial<Credentials> & WithFetchOptions): Promise<Paginator<{
		snapshots: {
			snapshot: {
				id: string;
				sourceSessionId: string;
				region: string;
				status: "failed" | "created" | "deleted";
				sizeBytes: number;
				createdAt: number;
				updatedAt: number;
				regions?: string[] | undefined;
				expiresAt?: number | undefined;
				lastUsedAt?: number | undefined;
				creationMethod?: string | undefined;
				parentId?: string | undefined;
			};
			siblings: {
				id: string;
				sourceSessionId: string;
				region: string;
				status: "failed" | "created" | "deleted";
				sizeBytes: number;
				createdAt: number;
				updatedAt: number;
				regions?: string[] | undefined;
				expiresAt?: number | undefined;
				lastUsedAt?: number | undefined;
				creationMethod?: string | undefined;
				parentId?: string | undefined;
			}[];
			count: string;
		}[];
		pagination: {
			count: number;
			next: string | null;
		};
		anchor?: {
			snapshot: {
				id: string;
				sourceSessionId: string;
				region: string;
				status: "failed" | "created" | "deleted";
				sizeBytes: number;
				createdAt: number;
				updatedAt: number;
				regions?: string[] | undefined;
				expiresAt?: number | undefined;
				lastUsedAt?: number | undefined;
				creationMethod?: string | undefined;
				parentId?: string | undefined;
			};
			siblings: {
				id: string;
				sourceSessionId: string;
				region: string;
				status: "failed" | "created" | "deleted";
				sizeBytes: number;
				createdAt: number;
				updatedAt: number;
				regions?: string[] | undefined;
				expiresAt?: number | undefined;
				lastUsedAt?: number | undefined;
				creationMethod?: string | undefined;
				parentId?: string | undefined;
			}[];
			count: string;
		} | undefined;
	}, "snapshots">>;
	/**
	 * Retrieve an existing snapshot.
	 *
	 * @param params - Get parameters and optional credentials.
	 * @returns A promise resolving to the {@link Sandbox}.
	 */
	static get(params: (GetSnapshotParams | (GetSnapshotParams & Credentials)) & WithFetchOptions): Promise<Snapshot$1>;
	/**
	 * Delete this snapshot.
	 *
	 * @param opts - Optional parameters.
	 * @param opts.signal - An AbortSignal to cancel the operation.
	 * @returns A promise that resolves once the snapshot has been deleted.
	 */
	delete(opts?: {
		signal?: AbortSignal;
	}): Promise<void>;
}
//#region src/utils/sandbox-snapshot.d.ts
export type SandboxSnapshot = Omit<SessionMetaData, "networkPolicy"> & {
	networkPolicy?: NetworkPolicy;
};
//#region src/session.d.ts
/**
 * Serialized representation of a Session for @workflow/serde.
 */
export interface SerializedSession {
	session: SandboxSnapshot;
	routes: SandboxRouteData[];
}
/** @inline */
export interface RunCommandParams {
	/**
	 * The command to execute
	 */
	cmd: string;
	/**
	 * Arguments to pass to the command
	 */
	args?: string[];
	/**
	 * Working directory to execute the command in
	 */
	cwd?: string;
	/**
	 * Environment variables to set for this command
	 */
	env?: Record<string, string>;
	/**
	 * If true, execute this command with root privileges. Defaults to false.
	 */
	sudo?: boolean;
	/**
	 * If true, the command will return without waiting for `exitCode`
	 */
	detached?: boolean;
	/**
	 * A `Writable` stream where `stdout` from the command will be piped
	 */
	stdout?: Writable;
	/**
	 * A `Writable` stream where `stderr` from the command will be piped
	 */
	stderr?: Writable;
	/**
	 * An AbortSignal to cancel the command execution
	 */
	signal?: AbortSignal;
	/**
	 * Maximum time in milliseconds the command may run before it is killed with
	 * SIGKILL. The timeout is enforced by the sandbox at exec time, so it applies
	 * whether or not the command is awaited (including `detached: true`).
	 */
	timeoutMs?: number;
}
declare class Session$1 implements ExecutionContext {
	private _client;
	/**
	 * Lazily resolve credentials and construct an API client.
	 * This is used in step contexts where the Sandbox was deserialized
	 * without a client (e.g. when crossing workflow/step boundaries).
	 * Uses getCredentials() which resolves from OIDC or env vars.
	 * @internal
	 */
	private ensureClient;
	/**
	 * Routes from ports to subdomains.
	 * @hidden
	 */
	readonly routes: SandboxRouteData[];
	/**
	 * Internal metadata about the current session.
	 */
	private session;
	private get client();
	/** @internal */
	get _sessionSnapshot(): SandboxSnapshot;
	/**
	 * Unique ID of this session.
	 */
	get sessionId(): string;
	get interactivePort(): number | undefined;
	/**
	 * The status of this session.
	 */
	get status(): SessionMetaData["status"];
	/**
	 * The creation date of this session.
	 */
	get createdAt(): Date;
	/**
	 * The timeout of this session in milliseconds.
	 */
	get timeout(): number;
	/**
	 * The network policy of this session.
	 */
	get networkPolicy(): NetworkPolicy | undefined;
	/**
	 * If the session was created from a snapshot, the ID of that snapshot.
	 */
	get sourceSnapshotId(): string | undefined;
	/**
	 * Memory allocated to this session in MB.
	 */
	get memory(): number;
	/**
	 * Number of vCPUs allocated to this session.
	 */
	get vcpus(): number;
	/**
	 * The region where this session is hosted.
	 */
	get region(): string;
	/**
	 * Legacy runtime identifier, when available.
	 *
	 * @deprecated Use the parent sandbox's image metadata instead.
	 */
	get runtime(): string | undefined;
	/**
	 * The working directory of this session.
	 */
	get cwd(): string;
	/**
	 * When this session was requested.
	 */
	get requestedAt(): Date;
	/**
	 * When this session started running.
	 */
	get startedAt(): Date | undefined;
	/**
	 * When this session was requested to stop.
	 */
	get requestedStopAt(): Date | undefined;
	/**
	 * When this session was stopped.
	 */
	get stoppedAt(): Date | undefined;
	/**
	 * When this session was aborted.
	 */
	get abortedAt(): Date | undefined;
	/**
	 * The wall-clock duration of this session in milliseconds.
	 */
	get duration(): number | undefined;
	/**
	 * When a snapshot was requested for this session.
	 */
	get snapshottedAt(): Date | undefined;
	/**
	 * When this session was last updated.
	 */
	get updatedAt(): Date;
	/**
	 * The amount of active CPU used by the session. Only reported once the VM is
	 * stopped.
	 */
	get activeCpuUsageMs(): number | undefined;
	/**
	 * The amount of network data used by the session. Only reported once the VM
	 * is stopped.
	 */
	get networkTransfer(): {
		ingress: number;
		egress: number;
	} | undefined;
	/**
	 * Serialize a Session instance to plain data for @workflow/serde.
	 *
	 * Although Sandbox handles top-level serialization, Session needs these
	 * methods so the Workflow SWC compiler can resolve the class by name.
	 * The `new Session(...)` self-reference in WORKFLOW_DESERIALIZE forces
	 * rolldown to preserve the class name in the compiled output.
	 */
	static [WORKFLOW_SERIALIZE](instance: Session$1): SerializedSession;
	static [WORKFLOW_DESERIALIZE](data: SerializedSession): Session$1;
	constructor(params: {
		client: APIClient;
		routes: SandboxRouteData[];
		session: SessionMetaData;
	} | {
		/** @internal – used during deserialization with an already-converted snapshot */
		routes: SandboxRouteData[];
		snapshot: SandboxSnapshot;
	});
	/** @internal */
	updateRoutes(routes: SandboxRouteData[]): void;
	/**
	 * Get a previously run command by its ID.
	 *
	 * @param cmdId - ID of the command to retrieve
	 * @param opts - Optional parameters.
	 * @param opts.signal - An AbortSignal to cancel the operation.
	 * @returns A {@link Command} instance representing the command
	 */
	getCommand(cmdId: string, opts?: {
		signal?: AbortSignal;
	}): Promise<Command$1>;
	/**
	 * Start executing a command in this session.
	 *
	 * @param command - The command to execute.
	 * @param args - Arguments to pass to the command.
	 * @param opts - Optional parameters.
	 * @param opts.signal - An AbortSignal to cancel the command execution.
	 * @param opts.timeoutMs - Maximum time in milliseconds to wait for the
	 * command to complete. On expiry the process is killed with SIGKILL.
	 * @returns A {@link CommandFinished} result once execution is done.
	 */
	runCommand(command: string, args?: string[], opts?: {
		signal?: AbortSignal;
		timeoutMs?: number;
	}): Promise<CommandFinished>;
	/**
	 * Start executing a command in detached mode.
	 *
	 * @param params - The command parameters.
	 * @returns A {@link Command} instance for the running command.
	 */
	runCommand(params: RunCommandParams & {
		detached: true;
	}): Promise<Command$1>;
	/**
	 * Start executing a command in this session.
	 *
	 * @param params - The command parameters.
	 * @returns A {@link CommandFinished} result once execution is done.
	 */
	runCommand(params: RunCommandParams): Promise<CommandFinished>;
	/**
	 * Create a directory in the filesystem of this session.
	 *
	 * @param path - Path of the directory to create
	 * @param opts - Optional parameters.
	 * @param opts.signal - An AbortSignal to cancel the operation.
	 */
	mkDir(path: string, opts?: {
		signal?: AbortSignal;
	}): Promise<void>;
	/**
	 * Open an interactive shell session. Returns the WebSocket URL and token the
	 * client uses to connect to the controller-hosted PTY.
	 *
	 * @param opts - Optional parameters.
	 * @param opts.signal - An AbortSignal to cancel the operation.
	 */
	openInteractive(opts?: {
		signal?: AbortSignal;
	}): Promise<{
		url: string;
		token: string;
	}>;
	/**
	 * Read a file from the filesystem of this session as a stream.
	 *
	 * @param file - File to read, with path and optional cwd
	 * @param opts - Optional parameters.
	 * @param opts.signal - An AbortSignal to cancel the operation.
	 * @returns A promise that resolves to a ReadableStream containing the file contents, or null if file not found
	 */
	readFile(file: {
		path: string;
		cwd?: string;
	}, opts?: {
		signal?: AbortSignal;
	}): Promise<NodeJS.ReadableStream | null>;
	/**
	 * Read a file from the filesystem of this session as a Buffer.
	 *
	 * @param file - File to read, with path and optional cwd
	 * @param opts - Optional parameters.
	 * @param opts.signal - An AbortSignal to cancel the operation.
	 * @returns A promise that resolves to the file contents as a Buffer, or null if file not found
	 */
	readFileToBuffer(file: {
		path: string;
		cwd?: string;
	}, opts?: {
		signal?: AbortSignal;
	}): Promise<Buffer | null>;
	/**
	 * Download a file from the session to the local filesystem.
	 *
	 * @param src - Source file on the session, with path and optional cwd
	 * @param dst - Destination file on the local machine, with path and optional cwd
	 * @param opts - Optional parameters.
	 * @param opts.mkdirRecursive - If true, create parent directories for the destination if they don't exist.
	 * @param opts.signal - An AbortSignal to cancel the operation.
	 * @returns The absolute path to the written file, or null if the source file was not found
	 */
	downloadFile(src: {
		path: string;
		cwd?: string;
	}, dst: {
		path: string;
		cwd?: string;
	}, opts?: {
		mkdirRecursive?: boolean;
		signal?: AbortSignal;
	}): Promise<string | null>;
	/**
	 * Write files to the filesystem of this session.
	 * Defaults to writing to /vercel/sandbox unless an absolute path is specified.
	 * Writes files using the sandbox's default user.
	 *
	 * @param files - Array of files with path and stream/buffer contents
	 * @param opts - Optional parameters.
	 * @param opts.signal - An AbortSignal to cancel the operation.
	 * @returns A promise that resolves when the files are written
	 */
	writeFiles(files: {
		path: string;
		content: string | Uint8Array;
		mode?: number;
	}[], opts?: {
		signal?: AbortSignal;
	}): Promise<void>;
	/**
	 * Get the public domain of a port of this session.
	 *
	 * @param p - Port number to resolve
	 * @returns A full domain (e.g. `https://subdomain.vercel.run`)
	 * @throws If the port has no associated route
	 */
	domain(p: number): string;
	/**
	 * Stop this session.
	 *
	 * @param opts - Optional parameters.
	 * @param opts.signal - An AbortSignal to cancel the operation.
	 * @returns The final session state and optional sandbox metadata.
	 */
	stop(opts?: {
		signal?: AbortSignal;
	}): Promise<{
		session: SandboxSnapshot;
		sandbox?: SandboxMetaData;
		snapshot?: SnapshotMetadata;
	}>;
	/**
	 * Update the current session's settings.
	 *
	 * @param params - Fields to update.
	 * @param params.networkPolicy - The new network policy to apply.
	 * @param opts - Optional parameters.
	 * @param opts.signal - An AbortSignal to cancel the operation.
	 *
	 * @example
	 * // Restrict to specific domains
	 * await session.update({
	 *   networkPolicy: {
	 *     allow: ["*.npmjs.org", "github.com"],
	 *   }
	 * });
	 *
	 * @example
	 * // Inject credentials with per-domain transformers
	 * await session.update({
	 *   networkPolicy: {
	 *     allow: {
	 *       "ai-gateway.vercel.sh": [{
	 *         transform: [{
	 *           headers: { authorization: "Bearer ..." }
	 *         }]
	 *       }],
	 *       "*": []
	 *     }
	 *   }
	 * });
	 *
	 * @example
	 * // Deny all network access
	 * await session.update({ networkPolicy: "deny-all" });
	 */
	update(params: {
		networkPolicy?: NetworkPolicy;
	}, opts?: {
		signal?: AbortSignal;
	}): Promise<void>;
	/**
	 * Extend the timeout of the session by the specified duration.
	 *
	 * This allows you to extend the lifetime of a session up until the maximum
	 * execution timeout for your plan.
	 *
	 * @param duration - The duration in milliseconds to extend the timeout by
	 * @param opts - Optional parameters.
	 * @param opts.signal - An AbortSignal to cancel the operation.
	 * @returns A promise that resolves when the timeout is extended
	 *
	 * @example
	 * const sandbox = await Sandbox.create({ timeout: ms('10m') });
	 * const session = sandbox.currentSession();
	 * // Extends timeout by 5 minutes, to a total of 15 minutes.
	 * await session.extendTimeout(ms('5m'));
	 */
	extendTimeout(duration: number, opts?: {
		signal?: AbortSignal;
	}): Promise<void>;
	/**
	 * Create a snapshot from this currently running session. New sandboxes can
	 * then be created from this snapshot using {@link Sandbox.create}.
	 *
	 * Note: this session will be stopped as part of the snapshot creation process.
	 *
	 * @param opts - Optional parameters.
	 * @param opts.expiration - Optional expiration time in milliseconds. Use 0 for no expiration at all.
	 * @param opts.signal - An AbortSignal to cancel the operation.
	 * @returns A promise that resolves to the Snapshot instance
	 */
	snapshot(opts?: {
		expiration?: number;
		signal?: AbortSignal;
	}): Promise<Snapshot$1>;
}
//#region src/execution-context.d.ts
/**
 * The common surface for running commands and performing file operations in
 * a sandbox, regardless of scope.
 *
 * Implemented by {@link Sandbox}, {@link Session}, and {@link SandboxUser},
 * so code can be written against "somewhere to run commands" without caring
 * whether it targets the whole sandbox or a specific user's context.
 *
 * Implementations may scope the operations: for example, {@link SandboxUser}
 * runs commands as its user and resolves relative paths against the user's
 * home directory.
 */
export interface ExecutionContext {
	/**
	 * Start executing a command in this context.
	 *
	 * @param command - The command to execute.
	 * @param args - Arguments to pass to the command.
	 * @param opts - Optional parameters.
	 * @returns A {@link CommandFinished} result once execution is done.
	 */
	runCommand(command: string, args?: string[], opts?: {
		signal?: AbortSignal;
		timeoutMs?: number;
	}): Promise<CommandFinished>;
	/**
	 * Start executing a command in this context in detached mode.
	 *
	 * @param params - The command parameters.
	 * @returns A {@link Command} instance for the running command.
	 */
	runCommand(params: RunCommandParams & {
		detached: true;
	}): Promise<Command$1>;
	/**
	 * Start executing a command in this context.
	 *
	 * @param params - The command parameters.
	 * @returns A {@link CommandFinished} result once execution is done.
	 */
	runCommand(params: RunCommandParams): Promise<CommandFinished>;
	/**
	 * Create a directory in the filesystem of this context.
	 *
	 * @param path - Path of the directory to create
	 * @param opts - Optional parameters.
	 */
	mkDir(path: string, opts?: {
		signal?: AbortSignal;
	}): Promise<void>;
	/**
	 * Read a file from this context as a stream.
	 *
	 * @param file - File to read, with path and optional cwd
	 * @param opts - Optional parameters.
	 * @returns A ReadableStream of the file contents, or null if not found
	 */
	readFile(file: {
		path: string;
		cwd?: string;
	}, opts?: {
		signal?: AbortSignal;
	}): Promise<NodeJS.ReadableStream | null>;
	/**
	 * Read a file from this context as a Buffer.
	 *
	 * @param file - File to read, with path and optional cwd
	 * @param opts - Optional parameters.
	 * @returns The file contents as a Buffer, or null if not found
	 */
	readFileToBuffer(file: {
		path: string;
		cwd?: string;
	}, opts?: {
		signal?: AbortSignal;
	}): Promise<Buffer | null>;
	/**
	 * Download a file from this context to the local filesystem.
	 *
	 * @param src - Source file in the sandbox
	 * @param dst - Destination on the local machine
	 * @param opts - Optional parameters.
	 * @returns The absolute path to the written file, or null if not found
	 */
	downloadFile(src: {
		path: string;
		cwd?: string;
	}, dst: {
		path: string;
		cwd?: string;
	}, opts?: {
		mkdirRecursive?: boolean;
		signal?: AbortSignal;
	}): Promise<string | null>;
	/**
	 * Write files to the filesystem of this context.
	 *
	 * @param files - Array of files with path, content, and optional mode
	 * @param opts - Optional parameters.
	 */
	writeFiles(files: {
		path: string;
		content: string | Uint8Array;
		mode?: number;
	}[], opts?: {
		signal?: AbortSignal;
	}): Promise<void>;
}
//#region src/drive.d.ts
export interface SerializedDrive {
	drive: DriveMetadata;
	projectId?: string;
}
/** @inline */
export interface GetOrCreateDriveParams {
	/**
	 * The name of the drive to get or create. Must be unique within the project.
	 */
	name: string;
	/**
	 * The region where the drive is created and stores its data. Defaults to `iad1`.
	 * See the Vercel documentation for the available regions.
	 */
	region?: SandboxRegion;
	/**
	 * Drive size in bytes. Defaults to 1 TiB.
	 */
	maxSize?: number;
	/**
	 * An AbortSignal to cancel the operation.
	 */
	signal?: AbortSignal;
}
declare class Drive$1 {
	private _client;
	private drive;
	private readonly _projectId;
	/**
	 * Lazily resolve credentials and construct an API client.
	 * @internal
	 */
	private ensureClient;
	/**
	 * Unique ID of this drive.
	 */
	get driveId(): string;
	/**
	 * The name of the drive.
	 */
	get name(): string;
	/**
	 * The project ID that owns the drive.
	 */
	get projectId(): string;
	/**
	 * The region where the drive data is stored.
	 */
	get region(): string;
	/**
	 * The maximum drive size in bytes.
	 */
	get maxSize(): number;
	/**
	 * Current session ID the drive is attached to, if any.
	 */
	get currentSessionId(): string | undefined;
	/**
	 * Current sandbox name the drive is attached to, if any.
	 */
	get currentSandboxName(): string | undefined;
	/**
	 * Timestamp when the drive was created.
	 */
	get createdAt(): Date;
	/**
	 * Timestamp when the drive was last updated.
	 */
	get updatedAt(): Date;
	/**
	 * Mount this drive as a read-only snapshot.
	 */
	snapshot(): {
		drive: string;
		mode: "snapshot";
	};
	/**
	 * Serialize a Drive instance to plain data for @workflow/serde.
	 *
	 * @param instance - The Drive instance to serialize
	 * @returns A plain object containing drive metadata
	 */
	static [WORKFLOW_SERIALIZE](instance: Drive$1): SerializedDrive;
	/**
	 * Deserialize a Drive from serialized data.
	 *
	 * The deserialized instance uses the serialized metadata synchronously and
	 * lazily creates an API client only when methods perform API requests.
	 *
	 * @param data - The serialized drive data
	 * @returns The reconstructed Drive instance
	 */
	static [WORKFLOW_DESERIALIZE](data: SerializedDrive): Drive$1;
	constructor({ client, drive, projectId }: {
		client?: APIClient;
		drive: DriveMetadata;
		projectId?: string;
	});
	/**
	 * Allow to get a list of drives for a team narrowed to the given params.
	 * It returns both the drives and the pagination metadata to allow getting
	 * the next page of results.
	 *
	 * The returned object is async-iterable to auto-paginate through all pages:
	 *
	 * ```ts
	 * const result = await Drive.list({ limit: 10 });
	 * for await (const drive of result) { ... }
	 * // or: await result.toArray();
	 * // or: for await (const page of result.pages()) { ... }
	 * ```
	 */
	static list(params?: Partial<Parameters<APIClient["listDrives"]>[0]> & Partial<Credentials> & WithFetchOptions): Promise<Paginator<{
		drives: Drive$1[];
		pagination: {
			count: number;
			next: string | null;
		};
	}, "drives">>;
	/**
	 * Retrieve an existing drive, or create a new one if it doesn't exists.
	 *
	 * @param params - Get/create parameters and optional credentials.
	 * @returns A promise resolving to the {@link Drive}.
	 */
	static getOrCreate(params: (GetOrCreateDriveParams | (GetOrCreateDriveParams & Credentials)) & WithFetchOptions): Promise<Drive$1>;
	/**
	 * Delete this drive. The drive must not be attached to any sandbox.
	 * This operation is irreversible and will delete all data stored in the drive.
	 *
	 * @param opts - Optional parameters.
	 * @param opts.signal - An AbortSignal to cancel the operation.
	 * @returns A promise that resolves once the drive has been deleted.
	 */
	delete(opts?: {
		signal?: AbortSignal;
	}): Promise<void>;
}
//#region src/filesystem.d.ts
export type WriteFileData = string | Buffer | Uint8Array;
export interface MkdirOptions {
	recursive?: boolean;
	signal?: AbortSignal;
}
export interface RmOptions {
	recursive?: boolean;
	force?: boolean;
	signal?: AbortSignal;
}
export interface SandboxHandle {
	readFileToBuffer(file: {
		path: string;
	}, opts?: {
		signal?: AbortSignal;
	}): Promise<Buffer | null>;
	writeFiles(files: {
		path: string;
		content: Buffer;
	}[], opts?: {
		signal?: AbortSignal;
	}): Promise<void>;
	mkDir(path: string, opts?: {
		signal?: AbortSignal;
	}): Promise<void>;
	runCommand(cmd: string, args?: string[], opts?: {
		signal?: AbortSignal;
	}): Promise<{
		exitCode: number;
		stdout(opts?: {
			signal?: AbortSignal;
		}): Promise<string>;
		stderr(opts?: {
			signal?: AbortSignal;
		}): Promise<string>;
	}>;
}
declare class FileSystem {
	/** @internal */
	private sandbox;
	/** @internal */
	constructor(sandbox: SandboxHandle);
	/**
	 * Read the entire contents of a file.
	 *
	 * @param path - Path to the file
	 * @param options - Encoding or options object. If encoding is specified, returns a string; otherwise returns a Buffer.
	 */
	readFile(path: string, options?: {
		encoding?: null;
		signal?: AbortSignal;
	} | null): Promise<Buffer>;
	readFile(path: string, options: {
		encoding: BufferEncoding;
		signal?: AbortSignal;
	} | BufferEncoding): Promise<string>;
	/**
	 * Write data to a file, replacing the file if it already exists.
	 *
	 * @param path - Path to the file
	 * @param data - The data to write
	 * @param options - Write options
	 */
	writeFile(path: string, data: WriteFileData, options?: {
		encoding?: BufferEncoding;
		signal?: AbortSignal;
	} | BufferEncoding): Promise<void>;
	/**
	 * Append data to a file, creating the file if it does not yet exist.
	 *
	 * @param path - Path to the file
	 * @param data - The data to append
	 * @param options - Write options
	 */
	appendFile(path: string, data: WriteFileData, options?: {
		encoding?: BufferEncoding;
		signal?: AbortSignal;
	} | BufferEncoding): Promise<void>;
	/**
	 * Create a directory.
	 *
	 * @param path - Path of the directory to create
	 * @param options - Options for directory creation
	 */
	mkdir(path: string, options?: MkdirOptions | number): Promise<string | undefined>;
	/**
	 * Read the contents of a directory.
	 *
	 * @param path - Path to the directory
	 * @param options - Options. When `withFileTypes` is true, returns `Dirent` objects.
	 */
	readdir(path: string, options?: {
		signal?: AbortSignal;
		withFileTypes?: false;
	}): Promise<string[]>;
	readdir(path: string, options: {
		signal?: AbortSignal;
		withFileTypes: true;
	}): Promise<Dirent[]>;
	/**
	 * Get file status. Follows symbolic links.
	 *
	 * @param path - Path to the file
	 * @param options - Options
	 */
	stat(path: string, options?: {
		signal?: AbortSignal;
	}): Promise<Stats>;
	/**
	 * Get file status. Does not follow symbolic links.
	 *
	 * @param path - Path to the file
	 * @param options - Options
	 */
	lstat(path: string, options?: {
		signal?: AbortSignal;
	}): Promise<Stats>;
	/**
	 * Remove a file or symbolic link.
	 *
	 * @param path - Path to the file
	 * @param options - Options
	 */
	unlink(path: string, options?: {
		signal?: AbortSignal;
	}): Promise<void>;
	/**
	 * Remove files and directories.
	 *
	 * @param path - Path to remove
	 * @param options - Options
	 */
	rm(path: string, options?: RmOptions): Promise<void>;
	/**
	 * Remove a directory.
	 *
	 * @param path - Path to the directory
	 * @param options - Options
	 */
	rmdir(path: string, options?: {
		signal?: AbortSignal;
	}): Promise<void>;
	/**
	 * Rename a file or directory.
	 *
	 * @param oldPath - Current path
	 * @param newPath - New path
	 * @param options - Options
	 */
	rename(oldPath: string, newPath: string, options?: {
		signal?: AbortSignal;
	}): Promise<void>;
	/**
	 * Copy a file.
	 *
	 * @param src - Source path
	 * @param dest - Destination path
	 * @param options - Options
	 */
	copyFile(src: string, dest: string, options?: {
		signal?: AbortSignal;
	}): Promise<void>;
	/**
	 * Test whether a file exists and the user has the specified permissions.
	 *
	 * @param path - Path to the file
	 * @param options - Options
	 */
	access(path: string, options?: {
		signal?: AbortSignal;
	}): Promise<void>;
	/**
	 * Check if a path exists.
	 *
	 * This is a convenience method not in `node:fs/promises` but commonly needed.
	 *
	 * @param path - Path to check
	 * @param options - Options
	 */
	exists(path: string, options?: {
		signal?: AbortSignal;
	}): Promise<boolean>;
	/**
	 * Change file mode (permissions).
	 *
	 * @param path - Path to the file
	 * @param mode - File mode (e.g., 0o755 or "755")
	 * @param options - Options
	 */
	chmod(path: string, mode: number | string, options?: {
		signal?: AbortSignal;
	}): Promise<void>;
	/**
	 * Change file owner and group.
	 *
	 * @param path - Path to the file
	 * @param uid - User ID
	 * @param gid - Group ID
	 * @param options - Options
	 */
	chown(path: string, uid: number, gid: number, options?: {
		signal?: AbortSignal;
	}): Promise<void>;
	/**
	 * Create a symbolic link.
	 *
	 * @param target - The target of the symbolic link
	 * @param path - The path of the symbolic link to create
	 * @param options - Options
	 */
	symlink(target: string, path: string, options?: {
		signal?: AbortSignal;
	}): Promise<void>;
	/**
	 * Read the value of a symbolic link.
	 *
	 * @param path - Path to the symbolic link
	 * @param options - Options
	 */
	readlink(path: string, options?: {
		signal?: AbortSignal;
	}): Promise<string>;
	/**
	 * Resolve the real path of a file (resolving symlinks).
	 *
	 * @param path - Path to resolve
	 * @param options - Options
	 */
	realpath(path: string, options?: {
		signal?: AbortSignal;
	}): Promise<string>;
	/**
	 * Truncate a file to a specified length.
	 *
	 * @param path - Path to the file
	 * @param len - Length to truncate to (default: 0)
	 * @param options - Options
	 */
	truncate(path: string, len?: number, options?: {
		signal?: AbortSignal;
	}): Promise<void>;
	/**
	 * Create a unique temporary directory.
	 *
	 * @param prefix - The prefix for the temporary directory name
	 * @param options - Options
	 * @returns The path of the created temporary directory
	 */
	mkdtemp(prefix: string, options?: {
		signal?: AbortSignal;
	}): Promise<string>;
}
//#region src/sandbox.d.ts
/** @inline */
export interface BaseCreateSandboxParams {
	/**
	 * The name of the sandbox. If omitted, a random name will be generated.
	 */
	name?: string;
	/**
	 * The source of the sandbox.
	 *
	 * Omit this parameter start a sandbox without a source.
	 *
	 * For git sources:
	 * - `depth`: Creates shallow clones with limited commit history (minimum: 1)
	 * - `revision`: Clones and checks out a specific commit, branch, or tag
	 */
	source?: {
		type: "git";
		url: string;
		depth?: number;
		revision?: string;
	} | {
		type: "git";
		url: string;
		username: string;
		password: string;
		depth?: number;
		revision?: string;
	} | {
		type: "tarball";
		url: string;
	};
	/**
	 * Array of port numbers to expose from the sandbox. Sandboxes can
	 * expose up to 15 ports.
	 */
	ports?: number[];
	/**
	 * Timeout in milliseconds before the sandbox auto-terminates.
	 */
	timeout?: number;
	/**
	 * Resources to allocate to the sandbox.
	 *
	 * Your sandbox will get the amount of vCPUs you specify here and
	 * 2048 MB of memory per vCPU.
	 */
	resources?: {
		vcpus: number;
	};
	/**
	 * Network policy to define network restrictions for the sandbox.
	 * Defaults to full internet access if not specified.
	 */
	networkPolicy?: NetworkPolicy;
	/**
	 * Default environment variables for the sandbox.
	 * These are inherited by all commands unless overridden with
	 * the `env` option in `runCommand`.
	 *
	 * @example
	 * const sandbox = await Sandbox.create({
	 *   env: { NODE_ENV: "production", API_KEY: "secret" },
	 * });
	 * // All commands will have NODE_ENV and API_KEY set
	 * await sandbox.runCommand("node", ["app.js"]);
	 */
	env?: Record<string, string>;
	/**
	 * Key-value tags to associate with the sandbox. Maximum 5 tags.
	 * @example { env: "staging", team: "infra" }
	 */
	tags?: Record<string, string>;
	/**
	 * The region to create the sandbox in. Defaults to `iad1`. Any Vercel
	 * region is supported, e.g. `sfo1`, `fra1`, `hnd1`, `syd1`.
	 * See the Vercel documentation for the full list.
	 */
	region?: SandboxRegion;
	/**
	 * Additional regions the sandbox can fail over to, e.g. `["sfo1", "fra1"]`.
	 * Must not include `region`.
	 */
	failoverRegions?: SandboxRegion[];
	/**
	 * List of drives to attach to the sandbox, keyed by the desired mount path.
	 * The drive must be created beforehand with `Drive.getOrCreate`.
	 *
	 * The mount paths must be absolute and cannot overlap with each other.
	 *
	 * @example
	 * const drive = await Drive.getOrCreate({ name: "my-drive" });
	 * const sandbox = await Sandbox.create({
	 *   mounts: {
	 *     "/data": drive,
	 *     "/snapshot": drive.snapshot(),
	 *   },
	 * });
	 */
	mounts?: SandboxMounts;
	/**
	 * An AbortSignal to cancel sandbox creation.
	 */
	signal?: AbortSignal;
	/**
	 * Enable or disable automatic restore of the filesystem between sessions.
	 */
	persistent?: boolean;
	/**
	 * Default snapshot expiration in milliseconds.
	 * When set, snapshots created for this sandbox will expire after this duration.
	 * Use `0` for no expiration.
	 */
	snapshotExpiration?: number;
	/**
	 * Retention policy that keeps only the N most recent snapshots of this
	 * sandbox. Older snapshots are evicted when a new one is created.
	 */
	keepLastSnapshots?: {
		/**
		 * Number of snapshots to keep (1-10).
		 */
		count: number;
		/**
		 * Expiration in milliseconds applied to kept snapshots.
		 * Use `0` for no expiration. Falls back to `snapshotExpiration` when omitted.
		 */
		expiration?: number;
		/**
		 * When `true` (the default), evicted snapshots are deleted immediately;
		 * when `false`, they keep the default expiration.
		 */
		deleteEvicted?: boolean;
	};
	/**
	 * Called when the sandbox session is resumed (e.g., after a snapshot restore).
	 * Use this to re-warm caches, restore transient state, or run other setup logic.
	 */
	onResume?: (sandbox: Sandbox$1) => Promise<void>;
}
export type SandboxMountMode = "read-write" | "snapshot";
export type SandboxMounts = Record<string, Drive$1 | {
	drive: string;
	mode: SandboxMountMode;
}>;
/**
 * A VCR image reference.
 */
export type SandboxImage = `vercel/sandbox/${ManagedImage}` | (string & {});
/**
 * Sandbox environment selection options.
 * @inline
 */
export type RuntimeOrImage = {
	/**
	 * A legacy Vercel-managed runtime.
	 *
	 * @deprecated Use `image` instead.
	 */
	runtime?: RUNTIMES | (string & {});
	image?: never;
} | {
	runtime?: never;
	/**
	 * A Vercel Container Registry (VCR) image to start the sandbox from,
	 * scoped to the sandbox's project or a shared image from any project. Accepts a repository name, an
	 * optional tag or digest, or a fully-qualified VCR URL. A bare
	 * repository name resolves to the `latest` tag. If omitted, the sandbox
	 * uses `vercel/sandbox/universal:latest`.
	 *
	 * @example "vercel/sandbox/universal" // Vercel managed image, latest tag
	 * @example "my-repo" // latest tag
	 * @example "my-repo:v1" // specific tag
	 * @example "my-repo@sha256:..." // specific digest
	 * @example "other-team/other-project/repo:v1" // Shared image from another team
	 * @example "vcr.vercel.com/my-team/my-project/repo:v1" // fully-qualified
	 */
	image?: SandboxImage;
};
export type CreateSandboxParams = (BaseCreateSandboxParams & RuntimeOrImage) | (Omit<BaseCreateSandboxParams, "source"> & {
	source: {
		type: "snapshot";
		snapshotId: string;
	};
	runtime?: never;
	image?: never;
});
/**
 * Parameters for {@link Sandbox.fork}.
 *
 * The fork inherits the source sandbox's current filesystem snapshot and the
 * server copies its config — resources, timeout, ports, tags, network policy,
 * image, persistence, snapshot settings, and environment variables. Any field
 * set here acts as an override of the copied value. When the source has no
 * snapshot, its base environment is copied.
 * @inline
 */
export type ForkSandboxParams = Omit<BaseCreateSandboxParams, "source"> & {
	/**
	 * Name of the source sandbox to fork from.
	 */
	sourceSandbox: string;
	/**
	 * A Vercel Container Registry (VCR) image to start the fork from, overriding
	 * the image copied from the source.
	 */
	image?: SandboxImage;
};
/** @inline */
export interface GetSandboxParams {
	/**
	 * The name of the sandbox.
	 */
	name: string;
	/**
	 * Whether to resume an existing session immediately. Defaults to false;
	 * a persistent sandbox still auto-resumes on the first SDK call that
	 * needs a running session (such as `runCommand`).
	 */
	resume?: boolean;
	/**
	 * An AbortSignal to cancel the operation.
	 */
	signal?: AbortSignal;
	/**
	 * Called when the sandbox session is resumed (e.g., after a snapshot restore).
	 * Use this to re-warm caches, restore transient state, or run other setup logic.
	 */
	onResume?: (sandbox: Sandbox$1) => Promise<void>;
}
/**
 * Combines {@link CreateSandboxParams} with get-specific options so that any
 * new parameter added to either flow is picked up automatically.
 * @inline
 */
export type GetOrCreateSandboxParams = CreateSandboxParams & {
	/**
	 * Whether to resume an existing session immediately. Defaults to false;
	 * a persistent sandbox still auto-resumes on the first SDK call that
	 * needs a running session (such as `runCommand`).
	 */
	resume?: boolean;
	/**
	 * Called once after a sandbox is freshly created (not when an existing
	 * sandbox is retrieved). Use this for one-time setup such as seeding
	 * files or warming caches. The returned promise is awaited before
	 * {@link Sandbox.getOrCreate} resolves.
	 */
	onCreate?: (sandbox: Sandbox$1) => Promise<void>;
};
/**
 * Serialized representation of a Sandbox for @workflow/serde.
 * Fields `metadata` and `routes` are the original wire format from main.
 * Fields `sandboxMetadata` and `projectId` are added for named-sandboxes.
 */
export interface SerializedSandbox {
	metadata: SandboxSnapshot;
	routes: SandboxRouteData[];
	sandboxMetadata?: SandboxMetaData;
	projectId?: string;
}
/**
 * A Sandbox is a persistent, isolated Linux MicroVMs to run commands in.
 * Use {@link Sandbox.create} or {@link Sandbox.get} to construct.
 * @hideconstructor
 */
declare class Sandbox$1 implements ExecutionContext {
	private _client;
	private readonly projectId;
	/**
	 * In-flight resume promise, used to deduplicate concurrent resume calls.
	 */
	private resumePromise;
	/**
	 * Internal Session instance for the current VM.
	 */
	private session;
	/**
	 * Internal metadata about the sandbox.
	 */
	private sandbox;
	/**
	 * Hook that will be executed when a new session is created during resume.
	 */
	private readonly onResume?;
	/**
	 * Memoized lookup of the sandbox's default user and its primary group.
	 * See {@link Sandbox.getDefaultUser}.
	 */
	private defaultUserPromise?;
	/**
	 * A `node:fs/promises`-compatible API for interacting with the sandbox filesystem.
	 *
	 * @example
	 * const content = await sandbox.fs.readFile('/etc/hostname', 'utf8');
	 * await sandbox.fs.writeFile('/tmp/hello.txt', 'Hello, world!');
	 * const files = await sandbox.fs.readdir('/tmp');
	 * const stats = await sandbox.fs.stat('/tmp/hello.txt');
	 */
	readonly fs: FileSystem;
	/**
	 * Lazily resolve credentials and construct an API client.
	 * @internal
	 */
	private ensureClient;
	/**
	 * The name of this sandbox.
	 */
	get name(): string;
	/**
	 * Routes from ports to subdomains.
	 * @hidden
	 */
	get routes(): SandboxRouteData[];
	/**
	 * Whether the sandbox persists the state.
	 */
	get persistent(): boolean;
	/**
	 * The region this sandbox is configured to run in. Where the running session
	 * actually landed is reported by {@link Session.region}.
	 */
	get region(): string;
	/**
	 * The additional regions this sandbox can fail over to, in order. Empty when
	 * it does not fail over.
	 */
	get failoverRegions(): string[];
	/**
	 * Number of virtual CPUs allocated.
	 */
	get vcpus(): number | undefined;
	/**
	 * Memory allocated in MB.
	 */
	get memory(): number | undefined;
	/**
	 * Legacy runtime identifier, when the sandbox was created with `runtime`.
	 *
	 * @deprecated Use {@link Sandbox.image} for image-backed sandboxes.
	 */
	get runtime(): string | undefined;
	/**
	 * Digest-pinned reference of the container image the sandbox was created
	 * from, when it was created from an image (`"{repository}@{manifestDigest}"`).
	 */
	get image(): string | undefined;
	/**
	 * Cumulative egress bytes across all sessions.
	 */
	get totalEgressBytes(): number | undefined;
	/**
	 * Cumulative ingress bytes across all sessions.
	 */
	get totalIngressBytes(): number | undefined;
	/**
	 * Cumulative active CPU duration in milliseconds across all sessions.
	 */
	get totalActiveCpuDurationMs(): number | undefined;
	/**
	 * Cumulative wall-clock duration in milliseconds across all sessions.
	 */
	get totalDurationMs(): number | undefined;
	/**
	 * When this sandbox was last updated.
	 */
	get updatedAt(): Date;
	/**
	 * When the sandbox status was last updated.
	 */
	get statusUpdatedAt(): Date | undefined;
	/**
	 * When this sandbox was created.
	 */
	get createdAt(): Date;
	/**
	 * Interactive port.
	 */
	get interactivePort(): number | undefined;
	/**
	 * The default working directory of the current session (e.g.
	 * `/vercel/sandbox`).
	 */
	get cwd(): string;
	/**
	 * The status of the current session.
	 */
	get status(): SessionMetaData["status"];
	/**
	 * The default timeout of this sandbox in milliseconds.
	 */
	get timeout(): number | undefined;
	/**
	 * When the currently running session will time out.
	 */
	get expiresAt(): Date | undefined;
	/**
	 * Key-value tags attached to the sandbox.
	 */
	get tags(): Record<string, string> | undefined;
	/**
	 * Drives mounted on the sandbox, keyed by mount path.
	 */
	get mounts(): SandboxMetaData["mounts"];
	/**
	 * The default network policy of this sandbox.
	 */
	get networkPolicy(): NetworkPolicy | undefined;
	/**
	 * If the session was created from a snapshot, the ID of that snapshot.
	 */
	get sourceSnapshotId(): string | undefined;
	/**
	 * The current snapshot ID of this sandbox, if any.
	 */
	get currentSnapshotId(): string | undefined;
	/**
	 * The default snapshot expiration in milliseconds, if set.
	 */
	get snapshotExpiration(): number | undefined;
	/**
	 * The snapshot retention policy (`keep-last-snapshots`) currently configured
	 * on this sandbox, if any.
	 */
	get keepLastSnapshots(): {
		count: number;
		expiration?: number;
		deleteEvicted?: boolean;
	} | undefined;
	/**
	 * The amount of CPU used by the session. Only reported once the VM is stopped.
	 */
	get activeCpuUsageMs(): number | undefined;
	/**
	 * The amount of network data used by the session. Only reported once the VM is stopped.
	 */
	get networkTransfer(): {
		ingress: number;
		egress: number;
	} | undefined;
	/**
	 * Allow to get a list of sandboxes for a team narrowed to the given params.
	 * It returns both the sandboxes and the pagination metadata to allow getting
	 * the next page of results.
	 *
	 * The returned object is async-iterable to auto-paginate through all pages:
	 *
	 * ```ts
	 * const result = await Sandbox.list({ namePrefix: "ci-" });
	 * for await (const sandbox of result) { ... }
	 * // or: await result.toArray();
	 * // or: for await (const page of result.pages()) { ... }
	 * ```
	 */
	static list<Tags extends Record<string, string>>(params?: Partial<Omit<Parameters<APIClient["listSandboxes"]>[0], "tags">> & {
		/**
		 * Filter sandboxes by tag. Only a single `{ key: value }` tag filter
		 * is currently supported.
		 * @example { env: "staging" }
		 */
		tags?: Tags & SingleTagFilter<Tags>;
	} & Partial<Credentials> & WithFetchOptions): Promise<Paginator<{
		sandboxes: {
			name: string;
			persistent: boolean;
			createdAt: number;
			updatedAt: number;
			currentSessionId: string;
			status: "pending" | "running" | "stopping" | "stopped" | "failed" | "aborted" | "snapshotting";
			region?: string | undefined;
			failoverRegions?: string[] | undefined;
			vcpus?: number | undefined;
			memory?: number | undefined;
			runtime?: string | undefined;
			image?: string | undefined;
			timeout?: number | undefined;
			networkPolicy?: {
				[x: string]: unknown;
				mode: "allow-all";
			} | {
				[x: string]: unknown;
				mode: "deny-all";
			} | {
				[x: string]: unknown;
				mode: "custom";
				allowedDomains?: string[] | undefined;
				allowedCIDRs?: string[] | undefined;
				deniedCIDRs?: string[] | undefined;
				injectionRules?: {
					domain: string;
					headers?: Record<string, string> | undefined;
					headerNames?: string[] | undefined;
					match?: {
						path?: {
							exact?: string | undefined;
							startsWith?: string | undefined;
							regex?: string | undefined;
						} | undefined;
						method?: string[] | undefined;
						queryString?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
						headers?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
					} | undefined;
				}[] | undefined;
				forwardRules?: {
					domain: string;
					forwardURL: string;
					match?: {
						path?: {
							exact?: string | undefined;
							startsWith?: string | undefined;
							regex?: string | undefined;
						} | undefined;
						method?: string[] | undefined;
						queryString?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
						headers?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
					} | undefined;
				}[] | undefined;
			} | undefined;
			totalEgressBytes?: number | undefined;
			totalIngressBytes?: number | undefined;
			totalActiveCpuDurationMs?: number | undefined;
			totalDurationMs?: number | undefined;
			expiresAt?: number | undefined;
			currentSnapshotId?: string | undefined;
			statusUpdatedAt?: number | undefined;
			cwd?: string | undefined;
			tags?: Record<string, string> | undefined;
			mounts?: Record<string, {
				drive: string;
				mode: "snapshot" | "read-write";
			}> | undefined;
			snapshotExpiration?: number | undefined;
			keepLastSnapshots?: {
				count: number;
				expiration?: number | undefined;
				deleteEvicted?: boolean | undefined;
			} | undefined;
		}[];
		pagination: {
			count: number;
			next: string | null;
		};
	}, "sandboxes">>;
	/**
	 * Serialize a Sandbox instance to plain data for @workflow/serde.
	 *
	 * @param instance - The Sandbox instance to serialize
	 * @returns A plain object containing sandbox metadata and routes
	 */
	static [WORKFLOW_SERIALIZE](instance: Sandbox$1): SerializedSandbox;
	/**
	 * Deserialize a Sandbox from serialized snapshot data.
	 *
	 * The deserialized instance uses the serialized metadata synchronously and
	 * lazily creates an API client only when methods perform API requests.
	 *
	 * @param data - The serialized sandbox data
	 * @returns The reconstructed Sandbox instance
	 */
	static [WORKFLOW_DESERIALIZE](data: SerializedSandbox): Sandbox$1;
	/**
	 * Create a new sandbox.
	 *
	 * By default, the sandbox uses `vercel/sandbox/universal:latest`, an
	 * Ubuntu-based image with Node.js 24, Bun, Python 3.14, coding agents, and
	 * common development utilities.
	 *
	 * @param params - Creation parameters and optional credentials.
	 * @returns A promise resolving to the created {@link Sandbox}.
	 * @example
	 * <caption>Create a sandbox with default options</caption>
	 * const sandbox = await Sandbox.create();
	 *
	 * @example
	 * <caption>Create a sandbox and drop it in the end of the block</caption>
	 * async function fn() {
	 *   await using const sandbox = await Sandbox.create();
	 *   // Sandbox automatically stopped at the end of the lexical scope
	 * }
	 */
	static create(params?: WithPrivate<CreateSandboxParams | (CreateSandboxParams & Credentials)> & WithFetchOptions): Promise<Sandbox$1 & AsyncDisposable>;
	/**
	 * Fork an existing sandbox into a new one.
	 *
	 * The server restores the fork from the source's current snapshot (or its
	 * base environment when it has none) and copies its config — resources,
	 * timeout, ports, tags, network policy, image, persistence, snapshot
	 * settings, and environment variables. Any field passed in `params` overrides
	 * the copied value.
	 *
	 * @param params - Fork parameters and optional credentials.
	 *   `sourceSandbox` is the name of the source sandbox; everything else
	 *   acts as an override.
	 * @returns A promise resolving to the new {@link Sandbox}.
	 *
	 * @example
	 * <caption>Fork with all config copied from the source</caption>
	 * const fork = await Sandbox.fork({ sourceSandbox: "prod-agent" });
	 *
	 * @example
	 * <caption>Fork with an explicit new name and overridden vcpus</caption>
	 * const fork = await Sandbox.fork({
	 *   sourceSandbox: "prod-agent",
	 *   name: "forked-prod-agent",
	 *   resources: { vcpus: 4 },
	 * });
	 */
	static fork(params: WithPrivate<ForkSandboxParams | (ForkSandboxParams & Credentials)> & WithFetchOptions): Promise<Sandbox$1 & AsyncDisposable>;
	/**
	 * Retrieve an existing sandbox and resume its session.
	 *
	 * @param params - Get parameters and optional credentials.
	 * @returns A promise resolving to the {@link Sandbox}.
	 */
	static get(params: WithPrivate<GetSandboxParams | (GetSandboxParams & Credentials)> & WithFetchOptions): Promise<Sandbox$1>;
	/**
	 * Retrieve an existing named sandbox, or create a new one if none exists.
	 *
	 * If `name` is omitted, this always creates a new sandbox and fires
	 * `onCreate`. If `name` is provided, it first tries {@link Sandbox.get};
	 * on `not_found` it creates a new sandbox with that name; on
	 * `snapshot_not_found` it deletes the stale named sandbox and creates
	 * a fresh one with the same name.
	 *
	 * @param params - Get/create parameters plus an optional `onCreate` hook.
	 * @returns A promise resolving to the {@link Sandbox}.
	 *
	 * @example
	 * <caption>Idempotent named sandbox with one-time setup</caption>
	 * const sandbox = await Sandbox.getOrCreate({
	 *   name: "my-workspace",
	 *   onCreate: async (sbx) => {
	 *     await sbx.writeFiles([
	 *       { path: "README.md", content: Buffer.from("# Hello") },
	 *     ]);
	 *   },
	 * });
	 *
	 * @example
	 * <caption>Unnamed — always creates</caption>
	 * const sandbox = await Sandbox.getOrCreate({
	 *   onCreate: async (sbx) => {
	 *     await sbx.runCommand("npm", ["install"]);
	 *   },
	 * });
	 */
	static getOrCreate(params?: WithPrivate<GetOrCreateSandboxParams | (GetOrCreateSandboxParams & Credentials)> & WithFetchOptions): Promise<Sandbox$1>;
	/**
	 * Create a new Sandbox instance.
	 *
	 * @param params.client - Optional API client. If not provided, will be lazily created using global credentials.
	 * @param params.routes - Port-to-subdomain mappings for exposed ports
	 * @param params.sandbox - Sandbox snapshot metadata
	 */
	constructor({ client, routes, session, sandbox, projectId, onResume }: {
		client?: APIClient;
		routes: SandboxRouteData[];
		session?: SessionMetaData;
		sandbox: SandboxMetaData;
		projectId?: string;
		onResume?: (sandbox: Sandbox$1) => Promise<void>;
	});
	/**
	 * Get the current session (the running VM) for this sandbox.
	 *
	 * @returns The {@link Session} instance.
	 */
	currentSession(): Session$1;
	/**
	 * Resume this sandbox by creating a new session via `getSandbox`.
	 */
	private resume;
	private doResume;
	/**
	 * Poll until the current session reaches a terminal state, then resume.
	 */
	private waitForStopAndResume;
	/**
	 * Execute `fn`, and if the session is stopped/stopping/snapshotting, resume and retry.
	 */
	private withResume;
	/**
	 * Start executing a command in this sandbox.
	 *
	 * @param command - The command to execute.
	 * @param args - Arguments to pass to the command.
	 * @param opts - Optional parameters.
	 * @param opts.signal - An AbortSignal to cancel the command execution.
	 * @param opts.timeoutMs - Maximum time in milliseconds to wait for the
	 * command to complete. On expiry the process is killed with SIGKILL.
	 * @returns A {@link CommandFinished} result once execution is done.
	 */
	runCommand(command: string, args?: string[], opts?: {
		signal?: AbortSignal;
		timeoutMs?: number;
	}): Promise<CommandFinished>;
	/**
	 * Start executing a command in detached mode.
	 *
	 * @param params - The command parameters.
	 * @returns A {@link Command} instance for the running command.
	 */
	runCommand(params: RunCommandParams & {
		detached: true;
	}): Promise<Command$1>;
	/**
	 * Start executing a command in this sandbox.
	 *
	 * @param params - The command parameters.
	 * @returns A {@link CommandFinished} result once execution is done.
	 */
	runCommand(params: RunCommandParams): Promise<CommandFinished>;
	/**
	 * Internal helper to start a command in the sandbox.
	 *
	 * @param params - Command execution parameters.
	 * @returns A {@link Command} or {@link CommandFinished}, depending on `detached`.
	 * @internal
	 */
	getCommand(cmdId: string, opts?: {
		signal?: AbortSignal;
	}): Promise<Command$1>;
	/**
	 * Create a directory in the filesystem of this sandbox.
	 *
	 * @param path - Path of the directory to create
	 * @param opts - Optional parameters.
	 * @param opts.signal - An AbortSignal to cancel the operation.
	 */
	mkDir(path: string, opts?: {
		signal?: AbortSignal;
	}): Promise<void>;
	/**
	 * Open an interactive shell session, resuming the sandbox if needed.
	 *
	 * @param opts - Optional parameters.
	 * @param opts.signal - An AbortSignal to cancel the operation.
	 * @returns The WebSocket URL and token used to connect to the PTY.
	 */
	openInteractive(opts?: {
		signal?: AbortSignal;
	}): Promise<{
		url: string;
		token: string;
	}>;
	/**
	 * Read a file from the filesystem of this sandbox as a stream.
	 *
	 * @param file - File to read, with path and optional cwd
	 * @param opts - Optional parameters.
	 * @param opts.signal - An AbortSignal to cancel the operation.
	 * @returns A promise that resolves to a ReadableStream containing the file contents, or null if file not found
	 */
	readFile(file: {
		path: string;
		cwd?: string;
	}, opts?: {
		signal?: AbortSignal;
	}): Promise<NodeJS.ReadableStream | null>;
	/**
	 * Read a file from the filesystem of this sandbox as a Buffer.
	 *
	 * @param file - File to read, with path and optional cwd
	 * @param opts - Optional parameters.
	 * @param opts.signal - An AbortSignal to cancel the operation.
	 * @returns A promise that resolves to the file contents as a Buffer, or null if file not found
	 */
	readFileToBuffer(file: {
		path: string;
		cwd?: string;
	}, opts?: {
		signal?: AbortSignal;
	}): Promise<Buffer | null>;
	/**
	 * Download a file from the sandbox to the local filesystem.
	 *
	 * @param src - Source file on the sandbox, with path and optional cwd
	 * @param dst - Destination file on the local machine, with path and optional cwd
	 * @param opts - Optional parameters.
	 * @param opts.mkdirRecursive - If true, create parent directories for the destination if they don't exist.
	 * @param opts.signal - An AbortSignal to cancel the operation.
	 * @returns The absolute path to the written file, or null if the source file was not found
	 */
	downloadFile(src: {
		path: string;
		cwd?: string;
	}, dst: {
		path: string;
		cwd?: string;
	}, opts?: {
		mkdirRecursive?: boolean;
		signal?: AbortSignal;
	}): Promise<string | null>;
	/**
	 * Write files to the filesystem of this sandbox.
	 * Defaults to writing to /vercel/sandbox unless an absolute path is specified.
	 * Writes files using the sandbox's default user.
	 *
	 * @param files - Array of files with path, content, and optional mode (permissions)
	 * @param opts - Optional parameters.
	 * @param opts.signal - An AbortSignal to cancel the operation.
	 * @returns A promise that resolves when the files are written
	 *
	 * @example
	 * // Write an executable script
	 * await sandbox.writeFiles([
	 *   { path: "/usr/local/bin/myscript", content: "#!/bin/bash\necho hello", mode: 0o755 }
	 * ]);
	 */
	writeFiles(files: {
		path: string;
		content: string | Uint8Array;
		mode?: number;
	}[], opts?: {
		signal?: AbortSignal;
	}): Promise<void>;
	/**
	 * Get the public domain of a port of this sandbox.
	 *
	 * @param p - Port number to resolve
	 * @returns A full domain (e.g. `https://subdomain.vercel.run`)
	 * @throws If the port has no associated route
	 */
	domain(p: number): string;
	/**
	 * Stop the sandbox.
	 *
	 * @param opts - Optional parameters.
	 * @param opts.signal - An AbortSignal to cancel the operation.
	 * @returns The final session state after stopping, with optional snapshot metadata.
	 */
	stop(opts?: {
		signal?: AbortSignal;
	}): Promise<SandboxSnapshot & {
		snapshot?: SnapshotMetadata;
	}>;
	/**
	 * Update the network policy for this sandbox.
	 *
	 * @deprecated Use {@link Sandbox.update} instead.
	 *
	 * @param networkPolicy - The new network policy to apply.
	 * @param opts - Optional parameters.
	 * @param opts.signal - An AbortSignal to cancel the operation.
	 * @returns A promise that resolves when the network policy is updated.
	 *
	 * @example
	 * // Restrict to specific domains
	 * await sandbox.updateNetworkPolicy({
	 *   allow: ["*.npmjs.org", "github.com"],
	 * });
	 *
	 * @example
	 * // Inject credentials with per-domain transformers
	 * await sandbox.updateNetworkPolicy({
	 *   allow: {
	 *     "ai-gateway.vercel.sh": [{
	 *       transform: [{
	 *         headers: { authorization: "Bearer ..." }
	 *       }]
	 *     }],
	 *     "*": []
	 *   }
	 * });
	 *
	 * @example
	 * // Deny all network access
	 * await sandbox.updateNetworkPolicy("deny-all");
	 */
	updateNetworkPolicy(networkPolicy: NetworkPolicy, opts?: {
		signal?: AbortSignal;
	}): Promise<NetworkPolicy>;
	/**
	 * Extend the timeout of the sandbox by the specified duration.
	 *
	 * This allows you to extend the lifetime of a sandbox up until the maximum
	 * execution timeout for your plan.
	 *
	 * @param duration - The duration in milliseconds to extend the timeout by
	 * @param opts - Optional parameters.
	 * @param opts.signal - An AbortSignal to cancel the operation.
	 * @returns A promise that resolves when the timeout is extended
	 *
	 * @example
	 * const sandbox = await Sandbox.create({ timeout: ms('10m') });
	 * // Extends timeout by 5 minutes, to a total of 15 minutes.
	 * await sandbox.extendTimeout(ms('5m'));
	 */
	extendTimeout(duration: number, opts?: {
		signal?: AbortSignal;
	}): Promise<void>;
	/**
	 * The user that non-`sudo` commands and the HTTP file API run as, together
	 * with that user's primary group. This depends on the sandbox image. The
	 * multi-user helpers group-own home and shared directories by this user's
	 * group so the file API can traverse them, so we resolve it from the running
	 * sandbox rather than assuming a fixed name.
	 *
	 * The result is memoized for the lifetime of this instance.
	 *
	 * @internal
	 */
	getDefaultUser(opts?: {
		signal?: AbortSignal;
	}): Promise<{
		username: string;
		group: string;
	}>;
	private resolveDefaultUser;
	/**
	 * Create a new Linux user in this sandbox with an isolated home directory.
	 *
	 * The home directory is group-owned by the sandbox's default user group with
	 * `770` permissions, so the SDK's HTTP file API can read/write directly.
	 * Other users cannot access this user's home directory since they are not in
	 * that group.
	 *
	 * @param username - Linux username (lowercase letters, digits, hyphens, underscores)
	 * @param opts - Optional parameters.
	 * @param opts.signal - An AbortSignal to cancel the operation.
	 * @returns A {@link SandboxUser} instance for the created user.
	 *
	 * @example
	 * const alice = await sandbox.createUser("alice");
	 * await alice.runCommand("whoami"); // "alice"
	 * await alice.writeFiles([{ path: "hello.txt", content: Buffer.from("hi") }]);
	 */
	createUser(username: string, opts?: {
		signal?: AbortSignal;
	}): Promise<SandboxUser>;
	/**
	 * Get a user handle without creating the user.
	 * Assumes the user already exists in the sandbox.
	 *
	 * @param username - Linux username
	 * @returns A {@link SandboxUser} instance.
	 *
	 * @example
	 * const root = sandbox.asUser("root");
	 * await root.runCommand("whoami"); // "root"
	 */
	asUser(username: "root" | (string & {})): SandboxUser;
	/**
	 * Create a new Linux group with a shared directory.
	 *
	 * Creates a shared directory at `/shared/<groupname>` with setgid permissions
	 * (`2770`), so files created inside it automatically inherit the group.
	 * All group members can read and write files in the shared directory.
	 *
	 * @param groupname - Group name (lowercase letters, digits, hyphens, underscores)
	 * @param opts - Optional parameters.
	 * @param opts.signal - An AbortSignal to cancel the operation.
	 * @returns An object with the group name and shared directory path.
	 *
	 * @example
	 * const devs = await sandbox.createGroup("devs");
	 * console.log(devs.sharedDir); // "/shared/devs"
	 * await sandbox.addUserToGroup("alice", "devs");
	 */
	createGroup(groupname: string, opts?: {
		signal?: AbortSignal;
	}): Promise<{
		groupname: string;
		sharedDir: string;
	}>;
	/**
	 * Add a user to a group.
	 *
	 * After joining, the user can read and write files in the group's
	 * shared directory at `/shared/<groupname>`.
	 *
	 * @param username - The user to add
	 * @param groupname - The group to add the user to
	 * @param opts - Optional parameters.
	 * @param opts.signal - An AbortSignal to cancel the operation.
	 *
	 * @example
	 * await sandbox.addUserToGroup("alice", "devs");
	 */
	addUserToGroup(username: string, groupname: string, opts?: {
		signal?: AbortSignal;
	}): Promise<void>;
	/**
	 * Remove a user from a group.
	 *
	 * @param username - The user to remove
	 * @param groupname - The group to remove the user from
	 * @param opts - Optional parameters.
	 * @param opts.signal - An AbortSignal to cancel the operation.
	 *
	 * @example
	 * await sandbox.removeUserFromGroup("alice", "devs");
	 */
	removeUserFromGroup(username: string, groupname: string, opts?: {
		signal?: AbortSignal;
	}): Promise<void>;
	/**
	 * Create a snapshot from this currently running sandbox. New sandboxes can
	 * then be created from this snapshot using {@link Sandbox.createFromSnapshot}.
	 *
	 * Note: this sandbox will be stopped as part of the snapshot creation process.
	 *
	 * @param opts - Optional parameters.
	 * @param opts.expiration - Optional expiration time in milliseconds. Use 0 for no expiration at all.
	 * @param opts.signal - An AbortSignal to cancel the operation.
	 * @returns A promise that resolves to the Snapshot instance
	 */
	snapshot(opts?: {
		expiration?: number;
		signal?: AbortSignal;
	}): Promise<Snapshot$1>;
	/**
	 * Update the sandbox configuration.
	 *
	 * When `ports` is provided, it is treated as the full desired port list:
	 * any currently exposed port omitted from the array will be deregistered.
	 *
	 * When `timeout` is increased and a session is currently running, the running
	 * session's deadline is also extended.
	 *
	 * `region` and `failoverRegions` apply to the next session; the currently
	 * running session keeps the region it started in. Pass an empty
	 * `failoverRegions` array to remove all failover regions.
	 *
	 * When `mounts` is provided, it replaces all current mounts and applies to
	 * the next session. Pass an empty object to remove all mounts.
	 *
	 * @param params - Fields to update.
	 * @param opts - Optional abort signal.
	 */
	update(params: {
		persistent?: boolean;
		resources?: {
			vcpus?: number;
		};
		timeout?: number;
		networkPolicy?: NetworkPolicy;
		tags?: Record<string, string>;
		ports?: number[];
		snapshotExpiration?: number;
		keepLastSnapshots?: {
			count: number;
			expiration?: number;
			deleteEvicted?: boolean;
		} | null;
		currentSnapshotId?: string;
		region?: SandboxRegion;
		failoverRegions?: SandboxRegion[];
		mounts?: SandboxMounts;
	}, opts?: {
		signal?: AbortSignal;
	}): Promise<void>;
	/**
	 * Delete this sandbox.
	 *
	 * After deletion the instance becomes inert — all further API calls will
	 * throw immediately.
	 *
	 * @param opts.deleteOrphanSnapshots - When true, the snapshots of this
	 * sandbox that are not used by any other sandbox are deleted asynchronously
	 * too. Defaults to false, which keeps them until they expire.
	 */
	delete(opts?: {
		deleteOrphanSnapshots?: boolean;
		signal?: AbortSignal;
	}): Promise<void>;
	/**
	 * List sessions (VMs) that have been created for this sandbox.
	 *
	 * @param params - Optional pagination parameters.
	 * @returns The list of sessions and pagination metadata.
	 */
	listSessions(params?: {
		limit?: number;
		cursor?: string;
		sortOrder?: "asc" | "desc";
		signal?: AbortSignal;
	}): Promise<Paginator<{
		sessions: {
			[x: string]: unknown;
			id: string;
			memory: number;
			vcpus: number;
			region: string;
			timeout: number;
			status: "pending" | "running" | "stopping" | "stopped" | "failed" | "aborted" | "snapshotting";
			requestedAt: number;
			createdAt: number;
			cwd: string;
			updatedAt: number;
			runtime?: string | undefined;
			startedAt?: number | undefined;
			requestedStopAt?: number | undefined;
			stoppedAt?: number | undefined;
			abortedAt?: number | undefined;
			duration?: number | undefined;
			sourceSnapshotId?: string | undefined;
			snapshottedAt?: number | undefined;
			interactivePort?: number | undefined;
			networkPolicy?: {
				[x: string]: unknown;
				mode: "allow-all";
			} | {
				[x: string]: unknown;
				mode: "deny-all";
			} | {
				[x: string]: unknown;
				mode: "custom";
				allowedDomains?: string[] | undefined;
				allowedCIDRs?: string[] | undefined;
				deniedCIDRs?: string[] | undefined;
				injectionRules?: {
					domain: string;
					headers?: Record<string, string> | undefined;
					headerNames?: string[] | undefined;
					match?: {
						path?: {
							exact?: string | undefined;
							startsWith?: string | undefined;
							regex?: string | undefined;
						} | undefined;
						method?: string[] | undefined;
						queryString?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
						headers?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
					} | undefined;
				}[] | undefined;
				forwardRules?: {
					domain: string;
					forwardURL: string;
					match?: {
						path?: {
							exact?: string | undefined;
							startsWith?: string | undefined;
							regex?: string | undefined;
						} | undefined;
						method?: string[] | undefined;
						queryString?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
						headers?: {
							key?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
							value?: {
								exact?: string | undefined;
								startsWith?: string | undefined;
								regex?: string | undefined;
							} | undefined;
						}[] | undefined;
					} | undefined;
				}[] | undefined;
			} | undefined;
			activeCpuDurationMs?: number | undefined;
			networkTransfer?: {
				ingress: number;
				egress: number;
			} | undefined;
		}[];
		pagination: {
			count: number;
			next: string | null;
		};
	}, "sessions">>;
	/**
	 * List snapshots that belong to this sandbox.
	 *
	 * @param params - Optional pagination parameters.
	 * @returns The list of snapshots and pagination metadata.
	 */
	listSnapshots(params?: {
		limit?: number;
		cursor?: string;
		sortOrder?: "asc" | "desc";
		signal?: AbortSignal;
	}): Promise<Paginator<{
		snapshots: {
			id: string;
			sourceSessionId: string;
			region: string;
			status: "failed" | "created" | "deleted";
			sizeBytes: number;
			createdAt: number;
			updatedAt: number;
			regions?: string[] | undefined;
			expiresAt?: number | undefined;
			lastUsedAt?: number | undefined;
			creationMethod?: string | undefined;
			parentId?: string | undefined;
		}[];
		pagination: {
			count: number;
			next: string | null;
		};
	}, "snapshots">>;
}
declare class SandboxUser implements ExecutionContext {
	/**
	 * The Linux username.
	 */
	readonly username: string;
	/**
	 * The user's home directory (e.g., `/home/alice`).
	 */
	readonly homeDir: string;
	private readonly sandbox;
	/**
	 * Memoized lookup of this user's primary group.
	 * See {@link SandboxUser.primaryGroup}.
	 */
	private primaryGroupPromise?;
	constructor({ sandbox, username }: {
		sandbox: Sandbox$1;
		username: string;
	});
	/**
	 * Build the wrapped command args to run as this user via `sudo -u`.
	 *
	 * When `env` is provided, injects `env KEY=VAL ...` so that environment
	 * variables survive the `sudo -u` transition.
	 */
	private buildUserCommand;
	/**
	 * Resolve a path relative to this user's home directory.
	 * Absolute paths are returned as-is.
	 */
	private resolvePath;
	/**
	 * Start executing a command as this user.
	 *
	 * @param command - The command to execute.
	 * @param args - Arguments to pass to the command.
	 * @param opts - Optional parameters.
	 * @returns A {@link CommandFinished} result once execution is done.
	 */
	runCommand(command: string, args?: string[], opts?: {
		signal?: AbortSignal;
		timeoutMs?: number;
	}): Promise<CommandFinished>;
	/**
	 * Start executing a command as this user in detached mode.
	 *
	 * @param params - The command parameters.
	 * @returns A {@link Command} instance for the running command.
	 */
	runCommand(params: RunCommandParams & {
		detached: true;
	}): Promise<Command$1>;
	/**
	 * Start executing a command as this user.
	 *
	 * @param params - The command parameters.
	 * @returns A {@link CommandFinished} result once execution is done.
	 */
	runCommand(params: RunCommandParams): Promise<CommandFinished>;
	/**
	 * Write files to this user's home directory (or absolute paths).
	 * Files are written via the sandbox HTTP API then chowned to this user.
	 *
	 * The HTTP API can write to user home dirs because they are group-owned
	 * by the sandbox's default user group with `770` permissions.
	 *
	 * @param files - Array of files with path, content, and optional mode
	 * @param opts - Optional parameters.
	 */
	writeFiles(files: {
		path: string;
		content: string | Uint8Array;
		mode?: number;
	}[], opts?: {
		signal?: AbortSignal;
	}): Promise<void>;
	/**
	 * Read a file from this user's context as a stream.
	 *
	 * @param file - File to read, with path and optional cwd
	 * @param opts - Optional parameters.
	 * @returns A ReadableStream of the file contents, or null if not found
	 */
	readFile(file: {
		path: string;
		cwd?: string;
	}, opts?: {
		signal?: AbortSignal;
	}): Promise<NodeJS.ReadableStream | null>;
	/**
	 * Read a file from this user's context as a Buffer.
	 *
	 * @param file - File to read, with path and optional cwd
	 * @param opts - Optional parameters.
	 * @returns The file contents as a Buffer, or null if not found
	 */
	readFileToBuffer(file: {
		path: string;
		cwd?: string;
	}, opts?: {
		signal?: AbortSignal;
	}): Promise<Buffer | null>;
	/**
	 * Download a file from this user's context to the local filesystem.
	 *
	 * @param src - Source file in the sandbox
	 * @param dst - Destination on the local machine
	 * @param opts - Optional parameters.
	 * @returns The absolute path to the written file, or null if not found
	 */
	downloadFile(src: {
		path: string;
		cwd?: string;
	}, dst: {
		path: string;
		cwd?: string;
	}, opts?: {
		mkdirRecursive?: boolean;
		signal?: AbortSignal;
	}): Promise<string | null>;
	/**
	 * Read a file as this user and return its bytes, or null if it does not
	 * exist.
	 *
	 * Reads via `sudo -u <user> base64` rather than the HTTP file API, which may
	 * not be able to read files this user has kept private (e.g. mode `600`).
	 * Reading as the user always honours the user's own permissions. The payload
	 * is base64-encoded because the command output channel is UTF-8 only and
	 * would otherwise corrupt binary files.
	 */
	private catAsUser;
	/**
	 * Create a directory owned by this user.
	 *
	 * @param path - Path of the directory to create
	 * @param opts - Optional parameters.
	 */
	mkDir(path: string, opts?: {
		signal?: AbortSignal;
	}): Promise<void>;
	/**
	 * This user's primary group. Users created via {@link Sandbox.createUser}
	 * get a group named after them, but {@link Sandbox.asUser} accepts
	 * pre-existing users whose primary group can differ (e.g. system users), so
	 * we resolve it from the sandbox rather than assuming `<username>`.
	 *
	 * The result is memoized for the lifetime of this instance.
	 */
	private primaryGroup;
	private resolvePrimaryGroup;
	/**
	 * Run `chown <ownership> <paths...>` as root, throwing on failure.
	 */
	private chownOrThrow;
	/**
	 * Run `chmod <mode> <paths...>` as root, throwing on failure.
	 */
	private chmodOrThrow;
	/**
	 * Given absolute leaf paths, return the directories strictly between this
	 * user's home directory and each leaf. The home dir itself is excluded, as
	 * are any paths that fall outside the home dir.
	 */
	private ancestorDirsUnderHome;
	/**
	 * Add this user to a group.
	 *
	 * @param groupname - Name of the group to join
	 * @param opts - Optional parameters.
	 */
	addToGroup(groupname: string, opts?: {
		signal?: AbortSignal;
	}): Promise<void>;
	/**
	 * Remove this user from a group.
	 *
	 * @param groupname - Name of the group to leave
	 * @param opts - Optional parameters.
	 */
	removeFromGroup(groupname: string, opts?: {
		signal?: AbortSignal;
	}): Promise<void>;
}

export {
	Sandbox$1 as Sandbox,
	Snapshot$1 as Snapshot,
};

export {};
