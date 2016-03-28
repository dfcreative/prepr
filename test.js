var test = require('tst');
var prepr = require('./');
var clean = require('cln');
var assert = require('assert');

test('Object macros', function () {
	assert.equal(clean(prepr(`
		#define QUATRE FOUR
		#define FOUR 4
		int x = QUATRE;
		#undef FOUR
		int y = QUATRE;
		#define FOUR 16
		int z = QUATRE;
	`)), clean(`
		int x = 4;
		int y = FOUR;
		int z = 16;
	`));

	assert.equal(clean(prepr(`
		#define NUMBERS 1, \
						2, \
						3
		int x[] = { NUMBERS };
	`)), clean(`
		int x[] = { 1, 2, 3 };
	`))
});

test('Function macros', function () {
	assert.equal(clean(prepr(`
		#define lang_init()  c_init()
		int x = lang_init();
		int y = lang_init;
		#undef lang_init
		int z = lang_init();
	`)), clean(`
		int x = c_init();
		int y = lang_init;
		int z = lang_init();
	`));

	assert.equal(clean(prepr(`
		#define lang_init ()    c_init()
		lang_init()
	`)), clean(`
		() c_init()()
	`));
});

test('Macro arguments', function () {
	test('Fn call', function () {
		assert.equal(clean(prepr(`
			#define min(X, Y)  ((X) < (Y) ? (X) : (Y))
			x = min(a, b);
			y = min(1, 2);
			z = min(a + 28, p);
		`)), clean(`
			x = ((a) < (b) ? (a) : (b));
			y = ((1) < (2) ? (1) : (2));
			z = ((a + 28) < (p) ? (a + 28) : (p));
		`));
	})

	test('Nested fn', function () {
		assert.equal(clean(prepr(`
			#define min(X, Y)  ((X) < (Y) ? (X) : (Y))
			min (min (a, b), c);
		`)), clean(`
			((((a) < (b) ? (a) : (b))) < (c) ? (((a) < (b) ? (a) : (b))) : (c));
		`));
	});

	test('Empty arg', function () {
		// min(, b);
		// min(a, );
		// min(,);
		// min((,),);
		// ((   ) < (b) ? (   ) : (b));
		// ((a  ) < ( ) ? (a  ) : ( ));
		// ((   ) < ( ) ? (   ) : ( ));
		// (((,)) < ( ) ? ((,)) : ( ));
	})

	// min()      error--> macro "min" requires 2 arguments, but only 1 given
	// min(,,)    error--> macro "min" passed 3 arguments, but takes just 2

	test('Ignore strings', function () {
		assert.equal(clean(prepr(`
			#define foo(x) x, "x"
			foo(bar);
		`)), clean(`
			bar, "x";
		`));
	});
});

test('Stringification', function () {
	assert.equal(clean(prepr(`
		#define WARN_IF(EXP) \
		do { if (EXP) \
			fprintf (stderr, "Warning: " #EXP "!"); } \
		while (0)
		WARN_IF (x == 0);
	`)), clean(`
		do { if (x == 0) fprintf (stderr, "Warning: " "x == 0" "!"); } while (0);
	`));

	assert.equal(clean(prepr(`
	#define xstr(s) str(s)
	#define str(s) #s
	#define foo 4
	str (foo);
	xstr (foo);
	`)), clean(`
	"foo";
	"4";
	`));
});

test('Concatenation', function () {
	assert.equal(clean(prepr(`
		#define COMMAND(NAME)  { #NAME, NAME ## _command }
		struct command =
		{
			COMMAND (quit),
			COMMAND (help),
		};
	`)), clean(`
		struct command =
		{
			{ "quit", quit_command },
			{ "help", help_command },
		};
	`));




});

test('Variadic macros', function () {
	// #define eprintf(...) fprintf (stderr, __VA_ARGS__)
	//  eprintf ("%s:%d: ", input_file, lineno)
	//         ==>  fprintf (stderr, "%s:%d: ", input_file, lineno)

	// #define eprintf(args...) fprintf (stderr, args) ← replaces VA_ARGS

	// #define eprintf(format, ...) fprintf (stderr, format, __VA_ARGS__)

	// eprintf ("success!\n")
	// ==> fprintf(stderr, "success!\n", );

	// #define eprintf(format, args...) fprintf (stderr, format , ##args)
});

// #define f(x) x x
// f (1
// #undef f
// #define f 2
// f)
//→ 1 2 1 2