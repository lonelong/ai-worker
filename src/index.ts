export default {
	async fetch(request, env, ctx) {
		// 处理 CORS 预检请求
		if (request.method === 'OPTIONS') {
			return handleCORS();
		}

		const url = new URL(request.url);

		// API 路由
		if (url.pathname === '/api/chat' && request.method === 'POST') {
			return await handleChatRequest(request, env);
		}

		// 健康检查端点
		if (url.pathname === '/health') {
			return new Response('OK', {
				status: 200,
				headers: getCORSHeaders(),
			});
		}

		return new Response('Not Found', {
			status: 404,
			headers: getCORSHeaders(),
		});
	},
};

// 处理聊天请求
async function handleChatRequest(request, env) {
	try {
		const { message, history } = await request.json();

		if (!message) {
			return new Response(JSON.stringify({ error: '消息不能为空' }), {
				status: 400,
				headers: {
					'Content-Type': 'application/json',
					...getCORSHeaders(),
				},
			});
		}

		// 调用 DeepSeek API
		const response = await callDeepSeekAPI(message, history, env);

		return new Response(JSON.stringify({ response }), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				...getCORSHeaders(),
			},
		});
	} catch (error) {
		console.error('Chat request error:', error);
		return new Response(
			JSON.stringify({
				error: '处理请求时出现错误',
				details: error.message,
			}),
			{
				status: 500,
				headers: {
					'Content-Type': 'application/json',
					...getCORSHeaders(),
				},
			}
		);
	}
}

// 调用 DeepSeek API
async function callDeepSeekAPI(message, history = [], env) {
	const DEEPSEEK_API_KEY = env.DEEPSEEK_API_KEY;

	if (!DEEPSEEK_API_KEY) {
		throw new Error('DeepSeek API key 未配置');
	}

	// 构建消息历史
	const messages = [];

	// 添加系统提示
	messages.push({
		role: 'system',
		content: '你是一个友善、有帮助的AI助手。请用中文回复，提供准确、有用的信息。',
	});

	// 添加历史消息（最多10条）
	const recentHistory = history.slice(-10);
	for (const msg of recentHistory) {
		messages.push({
			role: msg.type === 'user' ? 'user' : 'assistant',
			content: msg.content,
		});
	}

	// 添加当前消息
	messages.push({
		role: 'user',
		content: message,
	});
	try {
		const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				model: 'deepseek-chat',
				messages: messages,
				temperature: 0.7,
				max_tokens: 2000,
				stream: false,
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`DeepSeek API 错误: ${response.status} - ${errorText}`);
		}

		const data = await response.json();

		if (!data.choices || !data.choices[0] || !data.choices[0].message) {
			throw new Error('DeepSeek API 返回格式错误');
		}

		return data.choices[0].message.content;
	} catch (error) {
		console.error('DeepSeek API call failed:', error);
		throw new Error(`调用 DeepSeek API 失败: ${error.message}`);
	}
}

// 处理 CORS
function handleCORS() {
	return new Response(null, {
		status: 204,
		headers: getCORSHeaders(),
	});
}

// 获取 CORS 头
function getCORSHeaders() {
	return {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		'Access-Control-Max-Age': '86400',
	};
}
