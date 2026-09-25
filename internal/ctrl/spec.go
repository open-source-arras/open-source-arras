package ctrl

// Opts is the union of every io_* class's constructor opts object from controllers.js.
type Opts struct {
	Static bool

	StartAngle    float64
	HasStartAngle bool
	Speed         float64
	HasSpeed      bool
	OnlyWhenIdle  bool
	Independent   bool

	ReverseOnAlt    bool
	HasReverseOnAlt bool
	ReverseOnTheFly bool

	Distance    float64
	HasDistance bool
	Dynamic     bool
	Permanent   bool

	OnlyIfHasAltFireGun bool

	TimeUntilFire float64

	MapGoal          bool
	LockThroughWalls bool

	TurnwiseRange    float64
	HasTurnwiseRange bool

	LookAtGoal              bool
	ReplicatePlayerMovement bool
	DiepBossWander          bool

	MasterAngle bool
	// Formula overrides the default sin(frame/30).
	Formula func(frame float64) float64

	UseOwnMaster          bool
	MinDistance           float64
	HasMinDistance        bool
	MaxDistance           float64
	HasMaxDistance        bool
	InitialDist           float64
	HasInitialDist        bool
	RadiusScalingSpeed    float64
	HasRadiusScalingSpeed bool

	Invert bool

	Period       float64
	HasPeriod    bool
	Amplitude    float64
	HasAmplitude bool
	YOffset      float64
	HasYOffset   bool
	Angle        float64
	HasAngle     bool

	Range    float64
	HasRange bool
}

// Spec is an addController argument: which kind and options.
type Spec struct {
	Kind Kind
	Opts Opts
}
