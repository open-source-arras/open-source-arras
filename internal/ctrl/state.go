package ctrl

import (
	"arrasgo/internal/entity"
	"arrasgo/internal/vmath"
)

// State holds per-controller instance fields, one flat struct to match entity.Entity.
type State struct {
	SiegeEnabled bool

	CirclesTimer     int32
	CirclesPathAngle float64
	CirclesGoal      vmath.Vec2

	ListenStatic bool

	BoomerangR        float64
	BoomerangTurnover bool
	BoomerangGoal     vmath.Vec2
	BoomerangMaster   entity.EntityID

	GoToMasterGoal      vmath.Vec2
	GoToMasterCountdown int32

	OnlyIfHasAltFireGun bool

	TimeUntilFire float64

	TargetLock       entity.EntityID
	TargetTick       int32
	TargetLead       float64
	ValidTargets     []entity.EntityID
	LockThroughWalls bool
	MapGoal          bool

	MinionTurnwise      float64
	MinionTurnwiseRange float64
	HasTurnwiseRange    bool

	HangGoal  vmath.Vec2
	HangTimer int32

	SpinA            float64
	SpinSpeed        float64
	SpinOnlyWhenIdle bool
	SpinIndependent  bool

	Spin2Speed           float64
	Spin2ReverseOnAlt    bool
	Spin2ReverseOnTheFly bool
	// Spin2LastAlt starts -1, a sentinel outside {0,1}.
	Spin2LastAlt int8

	Fear float64

	ZoomDistance  float64
	ZoomDynamic   bool
	ZoomPermanent bool

	WanderLookAtGoal        bool
	WanderReplicateMovement bool
	WanderSpot              vmath.Vec2
	WanderBossWander        bool
	WanderTick              int32
	WanderGoal              vmath.Vec2
	WanderI                 int32

	WanderEnabled        bool
	WanderBotMoveEnabled bool
	WanderBotMoveActive  bool
	WanderMoveArray      int32
	WanderArrayLength    int32

	FormulaMasterAngle bool
	FormulaFn          func(frame float64) float64
	FormulaOriginAngle float64
	FormulaFrame       float64

	WhirlMinDistance        float64
	WhirlMaxDistance        float64
	WhirlRadiusScalingSpeed float64
	WhirlDist               float64
	WhirlInverseDist        float64
	WhirlUseOwnMaster       bool

	OrbitRealDist float64
	OrbitInvert   bool

	SnakeWaveInvert          float64
	SnakeWavePeriod          float64
	SnakeWaveAmplitude       float64
	SnakeYOffset             float64
	SnakeReverseWave         float64
	SnakeVelocityMagnitude   float64
	SnakeWaveAngle           float64
	SnakeStartX, SnakeStartY float64
	SnakeWaveHorizontalScale float64

	DisablePacify       bool
	DisableLastPacify   bool
	DisableSavedDamage  float64
	DisableInitialAlpha float64
	DisableTargetAlpha  float64

	ScaleStoredSize float64

	OroMasterX, OroMasterY         float64
	OroMasterBodyX, OroMasterBodyY float64
	OroGoal                        vmath.Vec2
	OroRange                       float64
	OroX                           float64
	OroSpeed                       float64
	OroLerpTimer                   float64
	// GonnaGoInFUCKINGCircles is kept verbatim per docs/architecture.md.
	GonnaGoInFUCKINGCircles bool

	// DontEverDareToDoThatSnakeShitEverAgainYouPieceOfShit is kept verbatim.
	DontEverDareToDoThatSnakeShitEverAgainYouPieceOfShit bool
}

const hangOutOrbit = 30.0
